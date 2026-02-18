export const moduleName = 'SmartChatAIGemini';

export const gameSystems = (() => {
    const genericPrompt = "I would like you to help me with running the game by coming up with ideas, answering questions, and improvising. Keep responses as short as possible.";
    // While Gemini can handle both Markdown and HTML, Markdown saves tokens and thus saves money if you are using paid models.
    const formatPrompt = "Always prettily format each answer with Markdown, including lists and tables where appropriate.";
    
    return {
        'generic': {
            name: 'Generic tabletop RPG',
            prompt: `You are a game master for a tabletop roleplaying game. ${genericPrompt} ${formatPrompt}`,
        },
        'dnd5e': {
            name: 'Dungeons & Dragons 5th Edition',
            prompt: `You are a dungeon master for a Dungeons & Dragons 5th Edition game. ${genericPrompt} Properly format spells, monsters, conditions, and so on. ${formatPrompt}`,
        },
        'pf2e': {
            name: 'Pathfinder Second Edition',
            prompt: `You are a game master for a Pathfinder 2nd Edition game. ${genericPrompt} Properly format spells, monsters, conditions, and so on. ${formatPrompt}`,
        },
    };
})();

export const registerSettings = () => {

    // --- API & MODEL CONFIG ---

    game.settings.register(moduleName, 'apiKey', {
        name: 'Gemini API key',
        hint: 'Required to connect. Generate your key at https://aistudio.google.com/app/apikey .',
        scope: 'world',
        config: true,
        type: String,
        default: '',
    });

    game.settings.register(moduleName, 'modelVersion', {
        name: 'Gemini Model Version',
        hint: 'Flash is faster/cheaper; Pro is better for complex world-building.',
        scope: 'world',
        config: true,
        type: String,
        default: 'gemini-3-flash-preview',
        choices: {
            'gemini-3-flash-preview': 'Gemini 3 Flash (Fast & Balanced - Recommended)',
            'gemini-3-pro-preview': 'Gemini 3 Pro (Deep Reasoning & Complexity)',
            'gemini-2.5-flash': 'Gemini 2.5 Flash',
            'gemini-2.5-pro': 'Gemini 2.5 Pro',
        },
    });

    game.settings.register(moduleName, 'maxOutputTokens', {
        name: 'Max Output Tokens',
        hint: 'Limits the length of the AI response to prevent chat overflow. Might not be needed with smart models, but dumber ones might start to ramble and repeat themselves, so they might need a cutoff to be specified. For reference, 1000 tokens is roughly 750 words.',
        scope: 'world',
        config: true,
        type: Number,
        default: 4096,
        range: { min: 128, max: 8192, step: 64 }
    });

    // --- PROMPT & CONTEXT ---

    game.settings.register(moduleName, 'gameSystem', {
        name: 'Game System',
        hint: 'Select your game system to optimize rules and responses.',
        scope: 'world',
        config: true,
        type: String,
        default: game.system.id in gameSystems ? game.system.id : 'generic',
        choices: Object.fromEntries(
            Object.entries(gameSystems).map(([id, desc]) => [id, desc.name])
        ),
        onChange: id => console.log(`${moduleName} | Game system changed to '${id}'.`),
    });

    game.settings.register(moduleName, 'gamePrompt', {
        name: 'Custom System Instruction',
        hint: 'This is the permanent persona of your AI. Replaces the default system prompt.',
        scope: 'world',
        config: true,
        type: String,
        default: gameSystems[game.system.id in gameSystems ? game.system.id : 'generic'].prompt,
        onChange: () => console.log(`${moduleName} | Gemini system instruction updated.`),
    });

    game.settings.register(moduleName, 'contextLength', {
        name: 'Conversation Memory',
        hint: 'How many previous messages the AI remembers. Higher values use more tokens. If you set it to a high value, you might want to manually start a new conversation (and clear history) via /ai clear',
        scope: 'world',
        config: true,
        type: Number,
        default: 10,
        range: { min: 0, max: 100 },
    });
    // Journal Context Setting - used to set UUID of a journal whose text can be sent to AI as context. You can use it to store your campaign progress, what happened previously, notes, homebrew rules, etc.
    game.settings.register(moduleName, 'journalContextUUID', {
        name: 'Campaign Context Journal (UUID)',
        hint: 'Drag and drop a Journal Entry here. Used by the /ai-m command to provide world info to Gemini.',
        scope: 'world',
        config: true,
        type: String,
        default: '',
    });

    
    // --- UI TWEAKS ---

    
    Hooks.on('renderSettingsConfig', (_settingsConfig, element, _data) => {
        // Add a placeholder to the UUID field to make it obvious what should go there
        html.find(`input[name='${moduleName}.journalContextUUID']`).attr("placeholder", "JournalEntry.xxxxxx");
    });
}

/**
 * Helper to get the current system prompt
 */
export const getGamePromptSetting = () => {
    const custom = game.settings.get(moduleName, 'gamePrompt')?.trim();
    if (custom) return custom;
    
    const systemId = game.settings.get(moduleName, 'gameSystem');
    return gameSystems[systemId]?.prompt || gameSystems['generic'].prompt;
}
