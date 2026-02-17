export const moduleName = 'SmartChatAIGemini';

export const gameSystems = (() => {
    const genericPrompt = "I would like you to help me with running the game by coming up with ideas, answering questions, and improvising. Keep responses as short as possible. Stick to the rules as much as possible.";
    // Note: Gemini is excellent at Markdown, but we keep the HTML instruction 
    // to ensure the Foundry chat log renders it correctly.
    const formatPrompt = "Always format each answer as HTML code without CSS, including lists and tables. Never use Markdown.";
    
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
        },
    });

    game.settings.register(moduleName, 'maxOutputTokens', {
        name: 'Max Output Tokens',
        hint: 'Limits the length of the AI response to prevent chat overflow. 1000 tokens is roughly 750 words.',
        scope: 'world',
        config: true,
        type: Number,
        default: 1000,
        range: { min: 100, max: 8000, step: 100 }
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
        hint: 'How many previous messages the AI remembers. Higher values use more tokens.',
        scope: 'world',
        config: true,
        type: Number,
        default: 5,
        range: { min: 0, max: 20 },
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
        // Hook to hide API key in the settings menu, making it a password field
        let apiKeyInput = element.find(`input[name='${moduleName}.apiKey']`)[0];
        if (apiKeyInput) {
            apiKeyInput.type = 'password';
            apiKeyInput.autocomplete = 'off';
        }

        // Turn the System Prompt input into a Textarea for easier editing of system prompt
        let promptInput = html.find(`input[name='${moduleName}.gamePrompt']`);
        if (promptInput.length) {
            const currentValue = promptInput.val();
            const textarea = $(`<textarea name="${moduleName}.gamePrompt" style="min-height: 200px; width: 100%; font-family: monospace;">${currentValue}</textarea>`);
            promptInput.replaceWith(textarea);
        }

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
