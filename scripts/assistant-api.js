/**
 * Assistant API - Simple wrapper for existing OpenAI Assistants
 * This module connects to an existing Assistant that the user created in OpenAI
 * Does NOT create assistants automatically
 */

import { moduleName } from './settings.js';

// ==================== THREAD & MESSAGE MANAGEMENT ====================

/**
 * Create a thread for conversation
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - Thread ID
 */
async function createThread(apiKey) {
	const threadUrl = 'https://api.openai.com/v1/threads';

	const options = {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'OpenAI-Beta': 'assistants=v2'
		},
		body: JSON.stringify({})
	};

	try {
		const response = await fetch(threadUrl, options);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Failed to create thread: ${errorData.error?.message}`);
		}

		const data = await response.json();
		return data.id;
	} catch (error) {
		throw new Error(`Error creating thread: ${error.message}`);
	}
}

/**
 * Send a message to a thread
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} message - User message
 * @returns {Promise<string>} - Message ID
 */
async function addMessageToThread(apiKey, threadId, message) {
	const messageUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

	const options = {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'OpenAI-Beta': 'assistants=v2'
		},
		body: JSON.stringify({
			role: 'user',
			content: message
		})
	};

	try {
		const response = await fetch(messageUrl, options);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Failed to add message: ${errorData.error?.message}`);
		}

		const data = await response.json();
		return data.id;
	} catch (error) {
		throw new Error(`Error adding message: ${error.message}`);
	}
}

/**
 * Run the assistant on a thread
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} assistantId - Assistant ID
 * @returns {Promise<string>} - Run ID
 */
async function runAssistant(apiKey, threadId, assistantId) {
	const runUrl = `https://api.openai.com/v1/threads/${threadId}/runs`;

	const options = {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'OpenAI-Beta': 'assistants=v2'
		},
		body: JSON.stringify({
			assistant_id: assistantId
		})
	};

	try {
		const response = await fetch(runUrl, options);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Failed to run assistant: ${errorData.error?.message}`);
		}

		const data = await response.json();
		return data.id;
	} catch (error) {
		throw new Error(`Error running assistant: ${error.message}`);
	}
}

/**
 * Wait for the assistant run to complete
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @param {string} runId - Run ID
 * @param {number} maxAttempts - Maximum polling attempts
 * @returns {Promise<object>} - Run status
 */
async function waitForRunCompletion(apiKey, threadId, runId, maxAttempts = 30) {
	const checkRunUrl = `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`;

	const options = {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'OpenAI-Beta': 'assistants=v2'
		}
	};

	for (let i = 0; i < maxAttempts; i++) {
		try {
			const response = await fetch(checkRunUrl, options);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Failed to check run status: ${errorData.error?.message}`);
			}

			const data = await response.json();

			if (data.status === 'completed') {
				return data;
			}

			if (data.status === 'failed' || data.status === 'cancelled') {
				throw new Error(`Run ${data.status}: ${data.last_error?.message || 'Unknown error'}`);
			}

			// Wait before polling again
			await new Promise(resolve => setTimeout(resolve, 1000));

		} catch (error) {
			throw new Error(`Error checking run status: ${error.message}`);
		}
	}

	throw new Error('Assistant run timed out after 30 seconds');
}

/**
 * Get the latest message from the assistant
 * @param {string} apiKey - OpenAI API key
 * @param {string} threadId - Thread ID
 * @returns {Promise<string>} - Assistant message content
 */
async function getLatestMessage(apiKey, threadId) {
	const messagesUrl = `https://api.openai.com/v1/threads/${threadId}/messages`;

	const options = {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
			'OpenAI-Beta': 'assistants=v2'
		}
	};

	try {
		const response = await fetch(messagesUrl, options);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`Failed to get messages: ${errorData.error?.message}`);
		}

		const data = await response.json();
		
		// Find the latest assistant message
		const assistantMessage = data.data.find(msg => msg.role === 'assistant');
		
		if (!assistantMessage) {
			throw new Error('No assistant message found');
		}

		// Extract text from the message
		const textContent = assistantMessage.content.find(content => content.type === 'text');
		
		if (!textContent) {
			throw new Error('No text content in assistant message');
		}

		return textContent.text.value;
	} catch (error) {
		throw new Error(`Error getting messages: ${error.message}`);
	}
}

// ==================== HIGH-LEVEL API ====================

/**
 * Call the Assistant API with a query
 * @param {string} query - User query
 * @param {string} assistantId - The Assistant ID to use
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - Assistant response
 */
export async function callAssistantApi(query, assistantId, apiKey) {
	if (!assistantId) {
		throw new Error('Assistant ID is required');
	}

	if (!apiKey) {
		throw new Error('API key is required');
	}

	console.debug(`${moduleName} | callAssistantApi(): Using Assistant ${assistantId.substring(0, 10)}...`);

	try {
		// Step 1: Create a thread
		const threadId = await createThread(apiKey);
		console.debug(`${moduleName} | Thread created: ${threadId}`);

		// Step 2: Add message to thread
		await addMessageToThread(apiKey, threadId, query);
		console.debug(`${moduleName} | Message added to thread`);

		// Step 3: Run the assistant
		const runId = await runAssistant(apiKey, threadId, assistantId);
		console.debug(`${moduleName} | Assistant run started: ${runId}`);

		// Step 4: Wait for completion
		await waitForRunCompletion(apiKey, threadId, runId);
		console.debug(`${moduleName} | Assistant run completed`);

		// Step 5: Get the response
		const response = await getLatestMessage(apiKey, threadId);
		console.debug(`${moduleName} | Response received: ${response.substring(0, 50)}...`);

		return response.trim();
	} catch (error) {
		console.error(`${moduleName} | Error in callAssistantApi:`, error);
		throw error;
	}
}

/**
 * Get Assistant response as HTML
 * @param {string} query - User query
 * @param {string} assistantId - The Assistant ID to use
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - Response formatted as HTML
 */
export async function getAssistantReplyAsHtml(query, assistantId, apiKey) {
	const answer = await callAssistantApi(query, assistantId, apiKey);
	
	// Convert markdown to HTML
	const html = /<\/?[a-z][\s\S]*>/i.test(answer) || !answer.includes('\n') ?
		answer : answer.replace(/\n/g, '<br>');
	
	return html.replaceAll('```', '');
}
