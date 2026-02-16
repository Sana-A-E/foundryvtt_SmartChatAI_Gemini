import { moduleName, getGamePromptSetting } from './settings.js';
import { pushHistory } from './history.js';
import { fetchWithRetry, convertToHtml } from './api-client.js'; // Note: removed getAuthHeader as Gemini uses URL keys

/**
 * Call Google Gemini API
 * Includes automatic retry logic, history management, and error handling
 * @param {string} query - User query
 * @returns {Promise<string>} - Response text (trimmed)
 */
async function callGeminiApi(query) {
    const apiKey = game.settings.get(moduleName, 'apiKey');
    const model = game.settings.get(moduleName, 'modelVersion') || 'gemini-flash-latest';
    const maxTokens = game.settings.get(moduleName, 'maxOutputTokens') || 1000;
    const systemPrompt = getGamePromptSetting();
    
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
            parts: [{ text: systemPrompt }]
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
 * Get response from Chat API formatted as HTML
 * @param {string} query - User query
 * @returns {Promise<string>} - Response formatted as HTML
 */
export async function getGptReplyAsHtml(query) {
    // Keeping the function name similar to avoid breaking other files for now
    const answer = await callGeminiApi(query);
    return convertToHtml(answer);
}
