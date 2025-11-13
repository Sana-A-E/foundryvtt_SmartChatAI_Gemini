# OpenAI Assistants Integration

This module now supports **optional** OpenAI Assistants API integration. Instead of creating Assistants automatically, you provide an existing Assistant ID from your OpenAI account.

## Quick Start

### Step 1: Create an Assistant (One-time setup)

1. Log in to [OpenAI Platform](https://platform.openai.com/assistants)
2. Click "+ Create" to create a new Assistant
3. Configure:
   - **Name**: Give it a descriptive name (e.g., "D&D Dungeon Master")
   - **Instructions**: Write system prompts for your use case
   - **Model**: Select gpt-4 or gpt-3.5-turbo
   - **Tools**: Enable Code Interpreter if needed
4. Click "Create"
5. **Copy the Assistant ID** (looks like `asst_xxxxxxxxxxxxxxxx`)

### Step 2: Configure in Foundry VTT

1. Open your Foundry world
2. Go to **Manage Modules** → **Module Settings**
3. Find **"Ask ChatGPT"** module settings
4. Paste your Assistant ID in the **"OpenAI Assistant ID (Optional)"** field
5. Save settings

That's it! The module will now use your Assistant instead of the Chat API.

## How It Works

### Chat API (Default)
- Used when **Assistant ID field is empty**
- Uses: `gameSystem`, `modelVersion`, `gamePrompt` settings
- Faster responses (no polling needed)
- Stateless (no conversation history between calls)

### Assistants API (When Assistant ID is configured)
- Used when **Assistant ID field has a value**
- **Ignores**: `gameSystem`, `modelVersion`, `gamePrompt` (uses your Assistant's configuration instead)
- Creates new thread for each conversation
- Slightly slower (polls for response completion)
- Can use Code Interpreter, Files, and other Assistant tools

## Configuration

### Settings Fields

```
API Key: Your OpenAI API key (required for both APIs)
↓
Model Version: Only used if Assistant ID is empty
Game System: Only used if Assistant ID is empty
Game Prompt: Only used if Assistant ID is empty
↓
Assistant ID (NEW): Optional Assistant ID from OpenAI
```

### Logic

```javascript
if (assistantId && assistantId.trim() !== '') {
  // Use Assistants API with provided ID
  // Ignores gameSystem, modelVersion, gamePrompt
} else {
  // Use Chat API with gameSystem, modelVersion, gamePrompt
  // Default behavior unchanged
}
```

## Testing

### Test with Unit Tests
```powershell
npm test
```
Tests the Chat API functions (17 tests, no external API calls)

### Test with Real Chat API
```powershell
$env:OPENAI_API_KEY = "sk-your-actual-key"
npm run test:real
```
Tests `callGptApi()` with real OpenAI Chat API

### Test with Real Assistants API
```powershell
$env:OPENAI_API_KEY = "sk-your-actual-key"
$env:ASSISTANT_ID = "asst_xxxxxxxxxxxxxxxx"
npm run test:assistant
```
Tests `callAssistantApi()` with your real Assistant

## API Details

### Chat API Functions (gpt-api.js)
```javascript
callGptApi(query)
  - Uses game.settings.get('apiKey', 'modelVersion', 'gameSystem', 'gamePrompt')
  - Returns plain text response
  - Includes retry logic (5 attempts)

getGptReplyAsHtml(query)
  - Returns HTML-formatted response with <br> tags
```

### Assistants API Functions (assistant-api.js)
```javascript
callAssistantApi(query, assistantId, apiKey)
  - Requires assistantId and apiKey as parameters
  - Creates new thread, adds message, runs assistant, polls for completion
  - Returns plain text response

getAssistantReplyAsHtml(query, assistantId, apiKey)
  - Returns HTML-formatted response with <br> tags
```

### Module Coordinator (module.js)
```javascript
respondTo(question, users)
  - Checks if assistantId is configured
  - Dynamically imports and uses appropriate API
  - Falls back to Chat API if assistantId is empty
```

## Advanced Configuration

### Create Multiple Assistants

You can create different Assistants for different purposes:

1. **Combat Assistant**: Specialized in combat rules
2. **Roleplay Assistant**: Specialized in character interactions
3. **Lore Assistant**: Specialized in world-building

Then simply update the Assistant ID in settings to switch between them.

### Assistant Configuration Recommendations

**For D&D 5e:**
```
Name: D&D 5e Dungeon Master
Instructions: You are an expert Dungeon Master for D&D 5e. 
Provide game mechanics guidance, NPC interactions, and adventure hooks.
Use the official D&D 5e rules from the Player's Handbook.
```

**For Pathfinder 2e:**
```
Name: Pathfinder 2e GM
Instructions: You are an expert Game Master for Pathfinder 2nd Edition.
Follow PF2e rules strictly. Provide clear mechanical explanations.
```

## Troubleshooting

### "Assistant ID not found" Error
- Verify the Assistant ID is correct (should start with `asst_`)
- Check it exists in your OpenAI account
- Ensure your API key has access to that Assistant

### Slow Responses
- Assistants API requires polling (typically 2-5 seconds)
- Chat API is faster if you don't need persistent Assistants
- Consider using gpt-3.5-turbo model for faster responses

### Settings Being Ignored
- When Assistant ID is set, `gameSystem`, `modelVersion`, `gamePrompt` are intentionally ignored
- Use your Assistant's instructions instead
- Remove Assistant ID to use Chat API settings again

## Architecture Decision: User-Provided IDs

This module uses a **user-provided ID approach** instead of auto-creating Assistants because:

1. **You control the Assistant**: Create it with exactly the tools and instructions you want
2. **Lower API costs**: Don't create throwaway Assistants
3. **Persistent configuration**: Your Assistant settings are stored in OpenAI
4. **Simpler logic**: No auto-creation or ID storage needed
5. **Better UX**: Just copy-paste your existing Assistant ID

## See Also

- [OpenAI Assistants API Docs](https://platform.openai.com/docs/assistants)
- [Creating Assistants Guide](https://platform.openai.com/docs/assistants/overview)
- [Chat Completions API Docs](https://platform.openai.com/docs/api-reference/chat)
