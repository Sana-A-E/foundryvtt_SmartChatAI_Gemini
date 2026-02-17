import { registerSettings, moduleName } from './settings.js';
import { getGptReplyAsHtml } from './gemini-api.js'; 


Hooks.once('init', () => {
    console.log(`${moduleName} | Initialization`);
    registerSettings();
});

Hooks.on('chatMessage', (chatLog, message, chatData) => {
    // Helper to echo the user's question back to them so they see what they asked
    const echoChatMessage = async (chatData, question, label = "Gemini AI") => {
        const toHtml = `<span class="smart-chat-to">To: ${label}</span><br>`;
        chatData.content = `${toHtml}${question.replace(/\n/g, "<br>")}`;
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
            
            echoChatMessage(chatData, question);
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

    // 3: /ai [question] (Shortcut for private whisper)
    const reAiShort = new RegExp(/^(\/ai\s)\s*([^]*)/, "i");
    match = message.match(reAiShort);
    if (match) {
        const question = match[2].trim();
        chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
        chatData.whisper = [game.user.id];
        echoChatMessage(chatData, question, "Gemini (Private)");
        respondTo(question, [game.user]); // Respond only to the sender
        return false; 
    }

    // 4: /ai-m [question] (/ai with "Memory" Journal Context)
    const reAiMem = new RegExp(/^(\/ai-m\s)\s*([^]*)/, "i");
    match = message.match(reAiMem);
    if (match) {
        const question = match[2].trim();
        chatData.type = CONST.CHAT_MESSAGE_TYPES.WHISPER;
        chatData.whisper = [game.user.id];
        echoChatMessage(chatData, question, "Gemini (Private with Journal Context)");
        // We pass a flag 'useJournal' to our respond function
        respondTo(question, [game.user], true); 
        return false;
    }

    return true;
});

/**
 * Fetch text from the Journal Entry configured in settings as a context source
 */
async function getJournalContext() {
    const uuid = game.settings.get(moduleName, 'journalContextUUID');
    if (!uuid) {
        console.warn(`${moduleName} | No Journal UUID set in settings.`);
        return "";
    }

    try {
        const entry = await fromUuid(uuid);
        if (!entry) {
            ui.notifications.error("Could not find the Lore Journal. Check the UUID in settings.");
            return "";
        }

        let combinedText = "";

        // Handle Journal Entry (which contains pages)
        if (entry.pages) {
            combinedText = entry.pages
                .filter(p => p.type === "text")
                .map(p => p.text?.content || "")
                .join("\n\n");
        } 
        // Handle a direct link to a single Page
        else if (entry.text?.content) {
            combinedText = entry.text.content;
        }

        if (!combinedText) return "";

        // Convert HTML to Plain Text to save tokens and avoid rendering errors
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = combinedText;
        const plainText = tempDiv.textContent || tempDiv.innerText || "";
        
        console.log(`${moduleName} | Extracted Lore (${plainText.length} chars):`, plainText.substring(0, 100) + "...");
        return plainText.trim();

    } catch (e) {
        console.error(`${moduleName} | Error reading Journal Context:`, e);
        return "";
    }
}

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
            content: '<i class="fas fa-spinner fa-spin"></i> Consulting the archives...',
            whisper: whisperIds,
            type: msgType
        });
        spinnerMessageId = spinnerMessage.id;

        // Handle Journal Context
        let finalQuery = question;
        if (useJournal) {
            const contextText = await getJournalContext();
            if (contextText) {
                // We wrap the context so the AI knows this is background info, not the direct question
                finalQuery = `background_information: """${contextText}"""\n\nuser_question: ${question}`;
                console.log(`${moduleName} | Attached ${contextText.length} chars of context.`);
            } else {
                ui.notifications.warn("No text found in the configured Context Journal.");
            }
        }

        // 2. Call the API (Using our updated gemini-api.js logic)
        // We kept the function name getGptReplyAsHtml in the import to minimize breaking changes
        const reply = await getGptReplyAsHtml(question);

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
            // Updated icon to a spark/star which fits Gemini's branding better than the microchip
            content: `<abbr title="${tooltip}" class="smart-chat-to fa-solid ${icon}"></abbr>
                <span class="smart-chat-reply">${reply}</span>`,
            whisper: whisperIds,
            type: msgType,
            sound: CONFIG.sounds.notification,
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
