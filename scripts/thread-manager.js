/**
 * Thread Manager for Assistants API
 * Manages persistent threads to maintain conversation context and reduce API calls
 */

import { moduleName } from './settings.js';
import { fetchWithRetry, getAuthHeader, getAssistantsBetaHeader } from './api-client.js';

// Store active threads per assistant
const activeThreads = new Map();

/**
 * Get existing thread or create a new one for an assistant
 * @param {string} apiKey - OpenAI API key
 * @param {string} assistantId - Assistant ID
 * @returns {Promise<string>} - Thread ID
 */
export async function getOrCreateThread(apiKey, assistantId) {
	// Check if we have an active thread for this assistant
	if (activeThreads.has(assistantId)) {
		const threadId = activeThreads.get(assistantId);
		console.debug(`${moduleName} | Reusing existing thread: ${threadId}`);
		return threadId;
	}

	// Create new thread
	console.debug(`${moduleName} | Creating new thread for assistant: ${assistantId.substring(0, 10)}...`);
	const threadUrl = 'https://api.openai.com/v1/threads';

	const options = {
		method: 'POST',
		headers: { ...getAuthHeader(apiKey), ...getAssistantsBetaHeader() },
		body: JSON.stringify({}),
	};

	const data = await fetchWithRetry(threadUrl, options, 'createThread');
	const threadId = data.id;

	// Store thread
	activeThreads.set(assistantId, threadId);
	console.debug(`${moduleName} | Thread created and cached: ${threadId}`);

	return threadId;
}

/**
 * Clear thread for a specific assistant
 * @param {string} assistantId - Assistant ID
 */
export function clearThread(assistantId) {
	if (activeThreads.has(assistantId)) {
		const threadId = activeThreads.get(assistantId);
		activeThreads.delete(assistantId);
		console.debug(`${moduleName} | Thread cleared for assistant: ${assistantId.substring(0, 10)}... (thread: ${threadId})`);
	}
}

/**
 * Clear all threads
 */
export function clearAllThreads() {
	const count = activeThreads.size;
	activeThreads.clear();
	console.debug(`${moduleName} | All threads cleared (${count} threads)`);
}

/**
 * Get active thread count
 * @returns {number} - Number of active threads
 */
export function getActiveThreadCount() {
	return activeThreads.size;
}
