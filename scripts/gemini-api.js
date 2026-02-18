import { moduleName, getGamePromptSetting } from './settings.js';
import { pushHistory } from './history.js';
import { fetchWithRetry, convertToHtml } from './api-client.js'; // Note: removed getAuthHeader as Gemini uses URL keys

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
 * Fetch text from the Journal Entry configured in settings as a context source
 */
async function getJournalContext() {
    const uuid = game.settings.get(moduleName, 'journalContextUUID');
    if (!uuid) return "";

    try {
        const entry = await fromUuid(uuid);
        if (!entry) {
            ui.notifications.warn("Gemini: Could not find the Lore Journal. Check UUID.");
            return "";
        }

        let combinedHtml = "";

        // Collect HTML from pages or main content
        if (entry.pages) {
            combinedHtml = entry.pages
                .filter(p => p.type === "text")
                .map(p => p.text?.content || "")
                .join("\n<hr>\n");
        } else if (entry.text?.content) {
            combinedHtml = entry.text.content;
        }

        if (!combinedHtml) return "";

        // --- CLEANER: Convert HTML tags to Newlines ---
        // 1. Replace block endings with newlines
        let text = combinedHtml.replace(/<\/(p|div|li|h[1-6])>/gi, "\n");
        // 2. Replace <br> with newlines
        text = text.replace(/<br\s*\/?>/gi, "\n");
        // 3. Strip all other tags
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = text;
        const cleanText = tempDiv.textContent || tempDiv.innerText || "";
        
        // 4. Clean up excessive newlines (optional, but looks nicer)
        return cleanText.replace(/\n\s*\n/g, "\n").trim();

    } catch (e) {
        console.error("Gemini Context Error:", e);
        return "";
    }
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
