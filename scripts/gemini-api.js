import { moduleName, getGamePromptSetting } from './settings.js';
import { pushHistory } from './history.js';
import { fetchWithRetry, convertToHtml } from './api-client.js'; 
import { JournalProcessor } from './journal-processor.js';
/**
 * Call Google Gemini API
 * Includes automatic retry logic, history management, and error handling
 * @param {string} query - User query
 * @returns {Promise<string>} - Response text (trimmed)
 */
async function callGeminiApi(query, hasJournalMemory = false) {
    const apiKey = game.settings.get(moduleName, 'apiKey');
    const model = game.settings.get(moduleName, 'modelVersion') || 'gemini-flash-latest';
    const maxTokens = game.settings.get(moduleName, 'maxOutputTokens') || 1000;
    const systemPrompt = getGamePromptSetting();

    let finalSystemInstruction = systemPrompt;
    // Handle Journal Context
    if (hasJournalMemory) {
        const contextText = await getJournalContext();
        if (contextText) {
            // If it's a query that should have Journal Memory access, we inject it into the System Prompt
            finalSystemInstruction = `${systemPrompt}\n\nYou have access to the following additional information, which might include additional instructions, World and Campaign Lore, information about previous events, the player party, homebrew rules or anything else regarding this game.\n\n${contextText}`;
        } else {
            ui.notifications.warn("No text found in the configured Context Journal.");
        }
    }
    
    // Gemini API uses the key in the URL rather than a Bearer token
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Map history to Gemini format. 
    // Gemini roles: 'user' and 'model' (OpenAI uses 'assistant')
    const history = pushHistory().map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Current user query
    const currentMessage = { role: 'user', parts: [{ text: query }] };

    // Build request body
    const requestBody = {
        // System instructions are handled separately in Gemini
        systemInstruction: {
            parts: [{ text: finalSystemInstruction }]
        },
        contents: [...history, currentMessage],
        generationConfig: {
            temperature: 1.0,
            maxOutputTokens: parseInt(maxTokens), // Ensure it's an integer
        },
    };

    const requestOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
    };

    try {
        // Fetch with automatic retries
        const data = await fetchWithRetry(apiUrl, requestOptions, 'Gemini AI API');

        // Extract response text from Gemini's nested structure
        const replyText = data.candidates[0].content.parts[0].text;
        
        // Save to history (converting back to the module's internal format if needed)
        const queryMessage = { role: 'user', content: query };
        const replyMessage = { role: 'assistant', content: replyText };
        pushHistory(queryMessage, replyMessage);

        return replyText.trim();
    } catch (error) {
        console.error(`${moduleName} | callGeminiApi failed:`, error);
        throw error;
    }
}

/**
 * Fetch text from the Journal Entry configured in settings as a context source. It also resolves Foundry links and converts it all to Markdown to save on token spend.
 */
async function getJournalContext(journalNameOrId) {
    // 1. Find the Journal Entry
    const journal = game.journal.getName(journalNameOrId) || game.journal.get(journalNameOrId);
    
    if (!journal) {
        console.warn(`Gemini Module | Journal "${journalNameOrId}" not found.`);
        return "";
    }

    console.log(`Gemini Module | Processing Journal: ${journal.name}`);
    let fullContent = "";

    // 2. Iterate through Pages (Foundry v10+)
    // journal.pages is a Collection, so we map over it
    const pages = journal.pages.contents.sort((a, b) => a.sort - b.sort);

    for (const page of pages) {
        if (page.type === "text") {

            // Step A: Strip [[brackets]] from raw text so they don't roll
            const cleanText = JournalProcessor.preProcess(page.text.content);

            // Step B: Enrich (resolves @UUID, actor stats, and [[/r]] commands)
            // We use 'secrets: true' so the AI sees GM hidden notes.
            const enrichedHtml = await TextEditor.enrichHTML(cleanText, {
                async: true,
                secrets: true, 
                relativeTo: page 
            });

            // 4. Convert to Markdown
            const markdown = JournalProcessor.convertHtmlToMarkdown(enrichedHtml);
            
            // Add Page Title as a header if valid
            if (markdown.trim().length > 0) {
                fullContent += `## Page: ${page.name}\n\n${markdown}\n\n---\n\n`;
            }
        }
    }

    return fullContent;
}

/**
 * Get response from Chat API formatted as HTML
 * @param {string} query - User query
 * @returns {Promise<string>} - Response formatted as HTML
 */
export async function getGptReplyAsHtml(query, hasJournalMemory = false) {
    // Keeping the function name similar to avoid breaking other files for now
    const answer = await callGeminiApi(query, hasJournalMemory);
    return convertToHtml(answer);
}
