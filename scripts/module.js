import { registerSettings, moduleName } from './settings.js';
import { getGptReplyAsHtml } from './gpt-api.js';


Hooks.once('init', () => {
	console.log(`${moduleName} | Initialization`);
	registerSettings();
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
	const echoChatMessage = async (chatData, question) => {
		const toGptHtml = '<span class="ask-chatgpt-to">To: Smart Chat</span><br>';
		chatData.content = `${toGptHtml}${question.replace(/\n/g, "<br>")}`;
		await ChatMessage.create(chatData);
	};

	let match;

	const reWhisper = new RegExp(/^(\/w(?:hisper)?\s)(\[(?:[^\]]+)\]|(?:[^\s]+))\s*([^]*)/, "i");
	match = message.match(reWhisper);
	if (match) {
		const gpt = 'gpt';
		const userAliases = match[2].replace(/[[\]]/g, "").split(",").map(n => n.trim());
		const question = match[3].trim();
		if (userAliases.some(u => u.toLowerCase() === gpt)) {
			const users = userAliases
				.filter(n => n.toLowerCase() !== gpt)
				.reduce((arr, n) => arr.concat(ChatMessage.getWhisperRecipients(n)), [game.user]);

			// same error logic as in Foundry
			if (!users.length) throw new Error(game.i18n.localize("ERROR.NoTargetUsersForWhisper"));
			if (users.some(u => !u.isGM && u.id != game.user.id) && !game.user.can("MESSAGE_WHISPER")) {
				throw new Error(game.i18n.localize("ERROR.CantWhisper"));
			}

			chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
			chatData.whisper = users.map(u => u.id);
			chatData.sound = CONFIG.sounds.notification;
			echoChatMessage(chatData, question);

			respondTo(question, users);

			// prevent further processing, since an unknown whisper target would trigger an error
			return false;
		}
	}

	const rePublic = new RegExp(/^(\/\?\s)\s*([^]*)/, "i");
	match = message.match(rePublic);
	if (match) {
		const question = match[2].trim();
		echoChatMessage(chatData, question);

		respondTo(question, []);

		// prevent further processing, since an unknown command would trigger an error
		return false;
	}

	return true;
});

async function respondTo(question, users) {
	console.debug(`${moduleName} | respondTo(question = "${question}", users =`, users, ')');
	try {
		// Declare variables in upper scope
		let apiKey;
		let assistantId;

		// PERSONAL MODE (current logic)
		apiKey = game.settings.get(moduleName, 'apiKey');
		assistantId = game.settings.get(moduleName, 'assistantId');
		
		// Validate that API key is configured
		if (!apiKey || !apiKey.trim()) {
			ui.notifications.error('Please configure your OpenAI API key in module settings');
			return;
		}
		

		let reply;
		let spinnerMessageId = null;

		// Unified logic for both modes
		if (assistantId && assistantId.trim()) {
			// Use Assistant API (Personal with own Assistant ID OR Premium)
			console.debug(`${moduleName} | Using Assistant API with ID: ${assistantId}`);
			
			// Show spinner for Assistants API
			const spinnerMessage = await ChatMessage.create({
				user: game.user.id,
				speaker: ChatMessage.getSpeaker({alias: 'GPT'}),
				content: '<i class="fas fa-spinner fa-spin"></i> Thinking...',
				whisper: users.map(u => u.id),
			});
			spinnerMessageId = spinnerMessage.id;
			
			const { getAssistantReplyAsHtml } = await import('./assistant-api.js');
			reply = await getAssistantReplyAsHtml(question, assistantId, apiKey);
		} else {
			// Use Chat Completions API
			console.debug(`${moduleName} | Using Chat Completions API`);
			reply = await getGptReplyAsHtml(question);
		}

		// Remove spinner if it was shown
		if (spinnerMessageId) {
			const spinnerMsg = game.messages.get(spinnerMessageId);
			if (spinnerMsg) await spinnerMsg.delete();
		}

		const abbr = "By ChatGPT. Statements may be false";
		await ChatMessage.create({
			user: game.user.id,
			speaker: ChatMessage.getSpeaker({alias: 'GPT'}),
			content: `<abbr title="${abbr}" class="ask-chatgpt-to fa-solid fa-microchip-ai"></abbr>
				<span class="ask-chatgpt-reply">${reply}</span>`,
			whisper: users.map(u => u.id),
			sound: CONFIG.sounds.notification,
		});
	} catch (e) {
		console.error(`${moduleName} | Failed to provide response.`, e);
		ui.notifications.error(e.message, {permanent: true, console: false});
		
		// Remove spinner if it exists
		if (spinnerMessageId) {
			const spinnerMsg = game.messages.get(spinnerMessageId);
			if (spinnerMsg) await spinnerMsg.delete();
		}
	}
}
