/**
 * Session Manager for Gemini
 * Repurposed from OpenAI Thread Manager. 
 * Since Gemini REST uses client-side history, this now manages 
 * local session IDs to help organize different chat contexts.
 */

import { moduleName } from './settings.js';

// Store active sessions (ID -> metadata)
const activeSessions = new Map();

/**
 * Get or create a session ID
 * For Gemini, we don't need to call a 'Create Thread' API.
 * We just generate a unique identifier for the current chat context.
 * @returns {string} - Session ID
 */
export function getOrCreateSession() {
    const defaultId = 'default-session';
    
    if (activeSessions.has(defaultId)) {
        return defaultId;
    }

    const sessionInfo = {
        id: defaultId,
        created: Date.now(),
        model: game.settings.get(moduleName, 'modelVersion')
    };

    activeSessions.set(defaultId, sessionInfo);
    console.debug(`${moduleName} | New local session initialized: ${defaultId}`);
    
    return defaultId;
}

/**
 * Clear the current session history
 */
export function clearSession() {
    // In our Gemini setup, this just triggers a history reset
    // This is handled by history.js, so we just clear our metadata here
    activeSessions.clear();
    console.debug(`${moduleName} | Session metadata cleared.`);
}

/**
 * Get active session count
 * @returns {number}
 */
export function getActiveSessionCount() {
    return activeSessions.size;
}
