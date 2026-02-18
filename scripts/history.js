import { moduleName } from './settings.js';
// Removed: import { clearAllThreads } from './thread-manager.js'; 
// (Gemini doesn't use server-side threads in this implementation)

let history = [];

export function pushHistory(...args) {
    // We access the setting directly here to know how much to remember
    const maxHistoryLength = game.settings.get(moduleName, 'contextLength');

    // Add new messages to the array
    history.push(...args);

    // If we have too many messages, drop the oldest ones
    // Note: In a conversation, we usually want to drop pairs (user+AI), 
    // but simple slicing works fine for basic context.
    if (history.length > maxHistoryLength) {
        history = history.slice(history.length - maxHistoryLength);
    }

    // Return the current history state
    return history;
}

/**
 * Clear conversation history
 * Useful for starting fresh conversations
 */
export function clearHistory() {
    history.length = 0;
    
    // Removed: clearAllThreads(); 
    // We just need to clear the local array.
    
    console.log(`${moduleName} | History cleared`);
}

/**
 * Getter to inspect history (optional helper)
 */
export function getHistory() {
    return history;
}
