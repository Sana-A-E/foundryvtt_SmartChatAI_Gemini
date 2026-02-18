/**
 * Generic HTTP client for Gemini APIs with retry logic
 * Handles retries, Gemini-specific error parsing, and logging
 */

import { moduleName } from './settings.js';

/**
 * Configuration for retry behavior
 * Adjusted for Gemini: slightly longer initial delay to respect free-tier RPM
 */
const RETRY_CONFIG = {
    maxAttempts: 5,
    initialDelayMs: 2000, 
    maxDelayMs: 30000,
};

/**
 * Make a fetch request with automatic retry logic
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options (method, headers, body)
 * @param {string} context - Context for logging
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function fetchWithRetry(url, options, context = 'API call') {
    let lastError;
    let delayMs = RETRY_CONFIG.initialDelayMs;

    for (let attempt = 0; attempt < RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            console.debug(`${moduleName} | ${context}: attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts}`);

            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                // Gemini Error structure: { error: { message: "...", code: 429, status: "..." } }
                const errorMsg = data?.error?.message || `HTTP ${response.status}`;
                
                // 429 = Rate Limit. We SHOULD retry this.
                if (response.status === 429) {
                    lastError = new Error(`Rate limit exceeded (429): ${errorMsg}`);
                    console.warn(`${moduleName} | ${lastError.message}, waiting to retry...`);
                } 
                // Other 4xx errors (400, 403, 404): fail immediately
                else if (response.status >= 400 && response.status < 500) {
                    throw new Error(`${context} failed permanently: ${errorMsg}`);
                } 
                // 5xx errors: retry
                else {
                    lastError = new Error(`${context} failed: ${errorMsg}`);
                    console.warn(`${moduleName} | ${lastError.message}, retrying...`);
                }
            } else {
                return data; // Success
            }

        } catch (error) {
            lastError = error;
            // If it's a "permanent" error thrown above, don't loop/retry
            if (error.message.includes("failed permanently")) throw error;
            console.warn(`${moduleName} | ${context}: ${error.message}`);
        }

        // Wait before retry (using exponential backoff)
        if (attempt < RETRY_CONFIG.maxAttempts - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            delayMs = Math.min(delayMs * 2, RETRY_CONFIG.maxDelayMs);
        }
    }

    throw new Error(`${context} failed after ${RETRY_CONFIG.maxAttempts} attempts: ${lastError.message}`);
}

/**
 * Convert response to HTML
 * Improved to handle Markdown tables/headings better and safer HTML detection
 */
export function convertToHtml(text) {
    if (!text) return "";
    
    // 1. Try to use Foundry's built-in Showdown converter for better Markdown support (Tables, etc.)
    // If you ask Gemini to "Reply in Markdown", this will now render correctly as a table!
    if (typeof showdown !== "undefined") {
        const converter = new showdown.Converter();
        converter.setOption('tables', true);
        converter.setOption('simpleLineBreaks', true);
        return converter.makeHtml(text);
    }

    // 2. Fallback: Manual Regex (Only if showdown is missing)
    // Check if it's strictly HTML (starts with a tag)
    if (/^\s*<[a-z][\s\S]*>/i.test(text)) return text;

    let html = text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
        .replace(/^\* (.*)/gm, '• $1')          // Bullets
        .replace(/###+\s?(.*)/gm, '<h3>$1</h3>') // Headings (Added support)
        .replace(/\n/g, '<br>');                 // Newlines

    // Remove markdown code blocks
    return html.replaceAll('```', '');
}

/**
 * Build Headers
 * For Gemini, the API key is usually in the URL, so we only need Content-Type.
 * We keep the name getAuthHeader for compatibility with other files.
 */
export function getAuthHeader() {
    return {
        'Content-Type': 'application/json'
    };
}
