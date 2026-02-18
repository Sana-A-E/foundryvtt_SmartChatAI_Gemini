import { registerSettings, moduleName } from './settings.js';
import { getGptReplyAsHtml } from './gemini-api.js'; 
import { clearHistory} from './history.js'; 

const GEMINI_ICON = `modules/${moduleName}/icons/gemini-portrait.webp`;

Hooks.once('init', () => {
    console.log(`${moduleName} | Initialization`);
    registerSettings();
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
    // Helper to echo the user's question back to them so they see what they asked
    const echoChatMessage = async (chatData, question, label = "Gemini AI") => {
        //const toHtml = `<span class="smart-chat-to">To: ${label}</span><br>`;
        chatData.content = `${toHtml}${question.replace(/\n/g, "<br>")}`;
        copy.flags = { [moduleName]: { isEcho: true } };
        await ChatMessage.create(chatData);
    };

    let match;

    // 1. Handle Whispers (e.g., "/w gemini How much is a Potion of Healing?")
    const reWhisper = new RegExp(/^(\/w(?:hisper)?\s)(\[(?:[^\]]+)\]|(?:[^\s]+))\s*([^]*)/, "i");
    match = message.match(reWhisper);
    
    if (match) {
        // We allow both 'gpt' (for muscle memory) and 'gemini'
        const triggers = ['gpt', 'gemini'];
        
        const userAliases = match[2].replace(/[[\]]/g, "").split(",").map(n => n.trim());
        const question = match[3].trim();

        // Check if any of the whispered users are our bot
        if (userAliases.some(u => triggers.includes(u.toLowerCase()))) {
            
            // Filter out the bot name from the whisper targets so we don't break Foundry's whisper logic
            const users = userAliases
                .filter(n => !triggers.includes(n.toLowerCase()))
                .reduce((arr, n) => arr.concat(ChatMessage.getWhisperRecipients(n)), [game.user]);

            // Standard Foundry whisper validation
            if (!users.length) throw new Error(game.i18n.localize("ERROR.NoTargetUsersForWhisper"));
            if (users.some(u => !u.isGM && u.id != game.user.id) && !game.user.can("MESSAGE_WHISPER")) {
                throw new Error(game.i18n.localize("ERROR.CantWhisper"));
            }

            chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
            chatData.whisper = users.map(u => u.id);
            chatData.sound = CONFIG.sounds.notification;
            
            echoChatMessage(chatData, question, "Gemini");
            respondTo(question, users); // Trigger the AI response

            return false; // Stop Foundry from processing this message further
        }
    }

    // 2. Handle Public Questions (e.g., "/? What is the DC for climbing?")
    const rePublic = new RegExp(/^(\/\?\s)\s*([^]*)/, "i");
    match = message.match(rePublic);
    if (match) {
        const question = match[2].trim();
        echoChatMessage(chatData, question);
        respondTo(question, []); // Empty array means public message
        return false;
    }
    
    // 3. /ai clear (For clearing history)
    const trimmedMessage = message.trim();
    if (trimmedMessage.toLowerCase() === "/ai clear") {
        clearHistory();
        ui.notifications.info("Gemini conversation history has been cleared.");
        return false; // Prevents the "/ai clear" text from being sent to chat
    }
    
    // 4: /ai [question] (Shortcut for private whisper)
    const reAiShort = new RegExp(/^(\/ai\s)\s*([^]*)/, "i");
    match = message.match(reAiShort);
    if (match) {
        const question = match[2].trim();
        chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
        chatData.whisper = [game.user.id];
        echoChatMessage(chatData, question, "Gemini");
        respondTo(question, [game.user]); // Respond only to the sender
        return false; 
    }

    // 5: /ai+ [question] (/ai with Journal Access for Context)
    const reAiMem = new RegExp(/^(\/ai\+\s)\s*([^]*)/, "i");
    match = message.match(reAiMem);
    if (match) {
        const question = match[2].trim();
        chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
        chatData.whisper = [game.user.id];
        echoChatMessage(chatData, question, "Gemini with Journal Context");
        // We pass a flag 'useJournal' to our respond function
        respondTo(question, [game.user], true); 
        return false;
    }

    return true;
});

Hooks.on("renderChatMessage", (message, html, data) => {
    // We check if the message has our custom 'isGemini' flag
    const isGemini = message.getFlag(moduleName, "isGemini");
    const isEcho = message.getFlag(moduleName, "isEcho");

    if (isGemini || isEcho) {
        // 1. Fix the Portrait to be portrait of gemini
        // We find the avatar image and force it to our Gemini icon
        if(isGemini) {
            const avatar = html.find('img.message-portrait');
            if (avatar.length) {
                avatar.attr("src", GEMINI_ICON);
            }
        }
        // 2. Fix the "To: [User]" label to say "To: Gemini"
        // We find the whisper recipient label and change it to Gemini
        const whisperTo = html.find('.whisper-to');
        if (whisperTo.length) {
            // If it's the AI's reply, it was sent "To: You", so we change it
            // If it's your question (the echo), it was also sent "To: You"
            const label = isGemini? game.user.name : "Gemini"; 
            //const prefix = isEcho ? "To: " : "From: ";
            
            whisperTo.text(`To: ${label}`);
        }
    }
});

async function respondTo(question, users, useJournal = false) {
    console.debug(`${moduleName} | respondTo(question = "${question}")`);
    
    // Track the spinner message ID so we can delete it later
    let spinnerMessageId = null;
    const msgType = users.length ? CONST.CHAT_MESSAGE_TYPES.WHISPER : CONST.CHAT_MESSAGE_TYPES.OTHER;
    const whisperIds = users.map(u => u.id);

    try {
        const apiKey = game.settings.get(moduleName, 'apiKey');
        
        // Validate that API key is configured
        if (!apiKey || !apiKey.trim()) {
            ui.notifications.error('Please configure your Google Gemini API key in module settings.');
            return;
        }

        // 1. Show "Thinking..." Spinner (Great UX for players)
        const spinnerMessage = await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({alias: 'Gemini'}),
            img: GEMINI_ICON,
            content: '<i class="fas fa-spinner fa-spin"></i> Consulting the archives...',
            whisper: whisperIds,
            type: msgType,
            flags: { [moduleName]: { isGemini: true } }
        });
        spinnerMessageId = spinnerMessage.id;

        // 2. Call the API (Using our updated gemini-api.js logic)
        // We kept the function name getGptReplyAsHtml in the import to minimize breaking changes
        const reply = await getGptReplyAsHtml(question, useJournal);

        // 3. Remove Spinner
        if (spinnerMessageId) {
            const spinnerMsg = game.messages.get(spinnerMessageId);
            if (spinnerMsg) await spinnerMsg.delete();
            spinnerMessageId = null; 
        }

        // 4. Post the actual reply
        const icon = useJournal ? "fa-book-open-reader" : "fa-sparkles"; // Different icon for context mode
        const tooltip = useJournal ? "Answered by Gemini using Campaign Journal" : "Generated by Gemini";
        
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({alias: 'Gemini'}),
            img: GEMINI_ICON,
            // Updated icon to a spark/star which fits Gemini's branding better than the microchip
            content: `<abbr title="${tooltip}" class="smart-chat-to fa-solid ${icon}"></abbr>
                <span class="smart-chat-reply">${reply}</span>`,
            whisper: whisperIds,
            type: msgType,
            sound: CONFIG.sounds.notification,
            flags: { [moduleName]: { isGemini: true } }
        });

    } catch (e) {
        console.error(`${moduleName} | Error:`, e);
        ui.notifications.error(`Gemini Error: ${e.message}`, {permanent: true});
        
        // Ensure spinner is gone even if we crash
        if (spinnerMessageId) {
            const spinnerMsg = game.messages.get(spinnerMessageId);
            if (spinnerMsg) await spinnerMsg.delete();
        }
    }
}
