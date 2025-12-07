import { moduleName } from './settings.js';
import { clearAllThreads } from './thread-manager.js';


let history = [];

export function pushHistory(...args) {
	const maxHistoryLength = game.settings.get(moduleName, 'contextLength');

	history.push(...args);
	if (history.length > maxHistoryLength) {
		history = history.slice(history.length - maxHistoryLength);
	}

	return history;
}

/**
 * Clear conversation history and associated threads
 * Useful for starting fresh conversations
 */
export function clearHistory() {
	history = [];
	clearAllThreads();
	console.log(`${moduleName} | History and threads cleared`);
}
