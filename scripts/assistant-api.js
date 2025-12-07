/**
 * OpenAI Assistants API wrapper
 * Uses existing Assistant created by user in OpenAI
 * Includes retry logic, history management, and consistent error handling
 */

import { moduleName } from './settings.js';
import { pushHistory } from './history.js';
import { fetchWithRetry, convertToHtml, getAuthHeader, getAssistantsBetaHeader } from './api-client.js';
import { getOrCreateThread } from './thread-manager.js';

/**
 * Add message to thread
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} message - Message content
 * @returns {Promise<string>} - Message ID
 */
async function addMessageToThread(apiKey, threadId, message) {
	const messageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

	const options = {
		method: 'POST',
		headers: { ...getAuthHeader(apiKey), ...getAssistantsBetaHeader() },
		body: JSON.stringify({
			role: 'user',
			content: message
		}),
	};

	const data = await fetchWithRetry(messageUrl, options, `addMessage(${threadId})`);
	return data.id;
}

/**
 * Run assistant on thread
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} assistantId - Assistant ID
 * @returns {Promise<string>} - Run ID
 */
async function runAssistant(apiKey, threadId, assistantId) {
	const runUrl = `https://api.openai.com/v1/threads/${threadId}/runs`;

	const options = {
		method: 'POST',
		headers: { ...getAuthHeader(apiKey), ...getAssistantsBetaHeader() },
		body: JSON.stringify({
			assistant_id: assistantId
		}),
	};

	const data = await fetchWithRetry(runUrl, options, `runAssistant(${assistantId})`);
	return data.id;
}

/**
 * Wait for run to complete with adaptive polling
 * Uses progressive delays: fast at start, slower as time goes on
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} runId - Run ID
 * @param {number} timeoutSeconds - Maximum time to wait in seconds
 * @returns {Promise<Object>} - Final run status
 * @throws {Error} - If timeout or run fails
 */
async function waitForRunCompletion(apiKey, threadId, runId, timeoutSeconds = 45) {
	const checkRunUrl = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;
	const startTime = Date.now();

	const options = {
		method: 'GET',
		headers: { ...getAuthHeader(apiKey), ...getAssistantsBetaHeader() },
	};

	// Adaptive polling delays (in milliseconds)
	// Start fast, then gradually slow down
	const delays = [
		250, 250, 500, 500,      // 0-2s: check every 250-500ms (4 checks)
		1000, 1000, 1000, 1000,  // 2-6s: check every 1s (4 checks)
		2000, 2000, 2000,        // 6-12s: check every 2s (3 checks)
		3000                     // 12s+: check every 3s
	];

	let attempt = 0;
	let runCompleted = false;

	while (!runCompleted) {
		try {
			// Check timeout
			const elapsed = (Date.now() - startTime) / 1000;
			if (elapsed > timeoutSeconds) {
				throw new Error(`Run timed out after ${timeoutSeconds}s`);
			}

			console.debug(`${moduleName} | Polling run status: attempt ${attempt + 1} (${elapsed.toFixed(1)}s elapsed)`);

			const response = await fetch(checkRunUrl, options);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Failed to check run status: ${errorData?.error?.message}`);
			}

			const data = await response.json();

			if (data.status === 'completed') {
				console.debug(`${moduleName} | Run completed successfully in ${elapsed.toFixed(1)}s`);
				runCompleted = true;
				return data;
			}

			if (data.status === 'failed' || data.status === 'cancelled') {
				throw new Error(
					`Run ${data.status}: ${data.last_error?.message || 'No error details'}`
				);
			}

			// Adaptive delay: use predefined delays, then default to 3s
			const delay = delays[attempt] || 3000;
			await new Promise(resolve => setTimeout(resolve, delay));
			attempt++;

		} catch (error) {
			if (error.message.includes('Run') || error.message.includes('timed out')) {
				throw error; // Re-throw run errors and timeouts
			}
			console.warn(`${moduleName} | Poll attempt failed: ${error.message}`);
			attempt++;
		}
	}
}

/**
 * Get latest message from thread
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @returns {Promise<string>} - Message content (text only)
 * @throws {Error} - If no message found
 */
async function getLatestMessage(apiKey, threadId) {
	const messagesUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

	const options = {
		method: 'GET',
		headers: { ...getAuthHeader(apiKey), ...getAssistantsBetaHeader() },
	};

	const data = await fetchWithRetry(messagesUrl, options, `getMessages(${threadId})`);

	// Find latest assistant message
	const assistantMessage = data.data.find(msg => msg.role === 'assistant');
	if (!assistantMessage) {
		throw new Error('No assistant message found in thread');
	}

	// Extract text content
	const textContent = assistantMessage.content.find(content => content.type === 'text');
	if (!textContent) {
		throw new Error('No text content in assistant message');
	}

	return textContent.text.value;
}

/**
 * Call Assistant API with full workflow
 * Creates thread, adds message, runs assistant, waits for completion, retrieves response
 * @param {string} query - User query
 * @param {string} assistantId - Assistant ID (from settings)
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - Response text (trimmed)
 * @throws {Error} - If any step fails
 */
export async function callAssistantApi(query, assistantId, apiKey) {
	if (!assistantId || !assistantId.trim()) throw new Error('Assistant ID is required');
	if (!apiKey || !apiKey.trim()) throw new Error('API key is required');

	const queryMessage = { role: 'user', content: query };

	try {
		console.debug(`${moduleName} | Starting Assistant workflow with ID: ${assistantId.substring(0, 10)}...`);

		// 1. Get or create thread (reuses existing thread for context persistence)
		const threadId = await getOrCreateThread(apiKey, assistantId);

		// 2. Add message
		await addMessageToThread(apiKey, threadId, query);
		console.debug(`${moduleName} | Message added to thread`);

		// 3. Run assistant
		const runId = await runAssistant(apiKey, threadId, assistantId);
		console.debug(`${moduleName} | Run started: ${runId}`);

		// 4. Wait for completion
		await waitForRunCompletion(apiKey, threadId, runId);
		console.debug(`${moduleName} | Run completed`);

		// 5. Get response
		const response = await getLatestMessage(apiKey, threadId);
		console.debug(`${moduleName} | Response received: ${response.substring(0, 50)}...`);

		// 6. Save to history (just like Chat API)
		const replyMessage = { role: 'assistant', content: response };
		pushHistory(queryMessage, replyMessage);

		return response.trim();

	} catch (error) {
		console.error(`${moduleName} | Assistant API error:`, error);
		throw error;
	}
}

/**
 * Get response from Assistant API formatted as HTML
 * @param {string} query - User query
 * @param {string} assistantId - Assistant ID
 * @param {string} apiKey - API key
 * @returns {Promise<string>} - Response formatted as HTML
 */
export async function getAssistantReplyAsHtml(query, assistantId, apiKey) {
	const answer = await callAssistantApi(query, assistantId, apiKey);
	return convertToHtml(answer);
}
