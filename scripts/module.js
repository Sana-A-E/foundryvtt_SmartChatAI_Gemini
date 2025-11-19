import { registerSettings, moduleName } from './settings.js';
import { getGptReplyAsHtml } from './gpt-api.js';


Hooks.once('init', () => {
	console.log(`${moduleName} | Initialization`);
	registerSettings();
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
	const echoChatMessage = async (chatData, question) => {
		const toGptHtml = '<span class="ask-chatgpt-to">To: GPT</span><br>';
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
		const configMode = game.settings.get(moduleName, 'configMode');
		
		// Declare variables in upper scope
		let apiKey;
		let assistantId;

		if (configMode === 'premium') {
			// PREMIUM MODE
			//const licenseCode = game.settings.get(moduleName, 'licenseCode');
			//const gameSystem = game.settings.get(moduleName, 'gameSystem');
			
			// TODO: Validate license with backend when ready
			// const premiumConfig = await validateLicense(licenseCode, gameSystem);
			
			// TEMPORARY: Mock response until backend is ready
			const premiumConfig = {
				valid: false, // Change to true when backend is ready
				apiKey: 'YOUR_API_KEY_FROM_BACKEND',
				assistantId: 'YOUR_ASSISTANT_ID_FROM_BACKEND'
			};
			
			if (!premiumConfig.valid) {
				ui.notifications.warn('Premium features are coming soon! Please use Personal mode for now.');
				return;
			}
			
			// Assign premium credentials from backend
			apiKey = premiumConfig.apiKey;
			assistantId = premiumConfig.assistantId;
			
		} else {
			// PERSONAL MODE (current logic)
			apiKey = game.settings.get(moduleName, 'apiKey');
			assistantId = game.settings.get(moduleName, 'assistantId');
			
			// Validate that API key is configured
			if (!apiKey || !apiKey.trim()) {
				ui.notifications.error('Please configure your OpenAI API key in module settings');
				return;
			}
		}

		let reply;

		// Unified logic for both modes
		if (assistantId && assistantId.trim()) {
			// Use Assistant API (Personal with own Assistant ID OR Premium)
			console.debug(`${moduleName} | Using Assistant API with ID: ${assistantId}`);
			const { getAssistantReplyAsHtml } = await import('./assistant-api.js');
			reply = await getAssistantReplyAsHtml(question, assistantId, apiKey);
		} else {
			// Use Chat API (only Personal without Assistant ID)
			if (configMode === 'premium') {
				ui.notifications.warn('Premium mode requires an Assistant. Please contact support.');
				return;
			}
			console.debug(`${moduleName} | Using Chat Completions API`);
			reply = await getGptReplyAsHtml(question);
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
	}
}
