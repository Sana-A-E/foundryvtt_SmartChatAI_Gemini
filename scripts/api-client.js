/**
 * Generic HTTP client for OpenAI APIs with retry logic
 * Handles retries, error parsing, and logging consistently
 */

import { moduleName } from './settings.js';

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
	maxAttempts: 5,
	initialDelayMs: 5000,
	maxDelayMs: 30000,
};

/**
 * Parse error from API response
 * @param {Response} response - Fetch response
 * @returns {string} - Error message
 */
/* async function parseErrorMessage(response) {
	try {
		const data = await response.json();
		return data?.error?.message || `HTTP ${response.status}`;
	} catch {
		return `HTTP ${response.status}`;
	}
} */

/**
 * Make a fetch request with automatic retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body)
 * @param {string} context - Context for logging (e.g., 'createThread')
 * @returns {Promise<Object>} - Parsed JSON response
 * @throws {Error} - If all retries fail
 */
export async function fetchWithRetry(url, options, context = 'API call') {
	let lastError;
	let delayMs = RETRY_CONFIG.initialDelayMs;

	for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
		try {
			console.debug(
				`${moduleName} | ${context}: attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}`
			);

			const response = await fetch(url, options);
			const data = await response.json();

			if (!response.ok) {
				// 4xx errors: don't retry, fail immediately
				if (response.status >= 400 && response.status < 500) {
					const errorMsg = data?.error?.message || `HTTP ${response.status}`;
					throw new Error(`${context} failed: ${errorMsg}`);
				}

				// 5xx or other errors: will retry
				lastError = new Error(
					`${context} failed: ${data?.error?.message || `HTTP ${response.status}`}`
				);
				console.warn(`${moduleName} | ${lastError.message}, retrying...`);
			} else {
				// Success
				console.debug(`${moduleName} | ${context}: success`);
				return data;
			}

		} catch (error) {
			lastError = error;
			console.warn(`${moduleName} | ${context}: ${error.message}`);
		}

		// Wait before retry (except on last attempt)
		if (attempt < RETRY_CONFIG.maxAttempts - 1) {
			console.debug(`${moduleName} | Waiting ${delayMs}ms before retry...`);
			await new Promise(resolve => setTimeout(resolve, delayMs));
			delayMs = Math.min(delayMs * 1.5, RETRY_CONFIG.maxDelayMs);
		}
	}

	// All retries exhausted
	throw new Error(
		`${context} failed after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError.message}`
	);
}

/**
 * Convert markdown response to HTML
 * Converts newlines to <br> and removes code blocks
 * @param {string} text - Response text (possibly with markdown)
 * @returns {string} - HTML formatted text
 */
export function convertToHtml(text) {
	// Check if already has HTML tags
	if (/<\/?[a-z][\s\S]*>/i.test(text) || !text.includes('\n')) {
		return text;
	}

	// Convert newlines to <br>
	const html = text.replace(/\n/g, '<br>');

	// Remove markdown code blocks
	return html.replaceAll('```', '');
}

/**
 * Build Authorization header
 * @param {string} apiKey - OpenAI API key
 * @returns {Object} - Header object
 */
export function getAuthHeader(apiKey) {
	return {
		'Authorization': `Bearer ${apiKey}`,
		'Content-Type': 'application/json',
	};
}

/**
 * Build OpenAI Assistants beta header
 * @returns {Object} - Header object
 */
export function getAssistantsBetaHeader() {
	return {
		'OpenAI-Beta': 'assistants=v2',
	};
}
