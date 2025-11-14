import { moduleName, getGamePromptSetting } from './settings.js';
import { pushHistory } from './history.js';
import { fetchWithRetry, convertToHtml, getAuthHeader } from './api-client.js';

/**
 * Call OpenAI Chat Completions API
 * Includes automatic retry logic, history management, and error handling
 * @param {string} query - User query
 * @returns {Promise<string>} - Response text (trimmed)
 */
async function callGptApi(query) {
	const apiKey = game.settings.get(moduleName, 'apiKey');
	const model = game.settings.get(moduleName, 'modelVersion');
	const prompt = getGamePromptSetting();
	const apiUrl = 'https://api.openai.com/v1/chat/completions';

	// Build message objects
	const promptMessage = { role: 'user', content: prompt };
	const queryMessage = { role: 'user', content: query };
	const messages = pushHistory().concat(promptMessage, queryMessage);

	// Build request
	const requestBody = {
		model,
		messages,
		temperature: 0.1,
	};

	const requestOptions = {
		method: 'POST',
		headers: getAuthHeader(apiKey),
		body: JSON.stringify(requestBody),
	};

	try {
		// Fetch with automatic retries
		const data = await fetchWithRetry(apiUrl, requestOptions, 'Chat Completions API');

		// Extract response
		const replyMessage = data.choices[0].message;
		
		// Save to history
		pushHistory(queryMessage, replyMessage);

		return replyMessage.content.trim();
	} catch (error) {
		console.error(`${moduleName} | callGptApi failed:`, error);
		throw error;
	}
}

/**
 * Get response from Chat API formatted as HTML
 * @param {string} query - User query
 * @returns {Promise<string>} - Response formatted as HTML
 */
export async function getGptReplyAsHtml(query) {
	const answer = await callGptApi(query);
	return convertToHtml(answer);
}
