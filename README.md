# Smart Chat AI

Bring AI to your Foundry VTT table with powerful Gemini integration.

The module is a fork of [SmartChatAI](https://github.com/marccosta12/foundryvtt_SmartChatAI) which has OpenAI GPT support (big thanks to everyone who made this possible!)
I altered the code to use Gemini instead of GPT, since Gemini has a free tier of usage, and I personally prefer it over ChatGPT. Since this is a fork primarily made for personal purposes, I probably won't be actively developing it. Don't count on active maintenance either, although, I probably will maintain it as long as I use it regularly.

I tested it in Foundry VTT 12, and it works properly (despite countless modules I've got active, some of which upgrade chat functionalities.) It's a lightweight module, that shouldn't add any overhead or break anything.

## Quick Start

1. **Get your API key** from [Google AIStudio](https://aistudio.google.com/app/apikey)
2. **Install the module:**
You can do a git pull into your modules folder (`git clone https://github.com/Sana-A-E/foundryvtt_SmartChatAI_Gemini.git SmartChatAIGemini`) or download the repo manually into your user modules folder, however, be sure to call the parent folder of this module "SmartChatAIGemini". I haven't set up releases yet so you can't download it via Foundry module manager.
4. **Configure settings** with your API key and preferred AI model. You can also change system prompt and some other stuff.
5. **Start asking!** Use `/?` for a public question that all players will see. Use `/w gemini` or `/ai` to chat with gemini privately. Use `/ai-m` if you want to chat privately and send a configured Journal entry as context to Gemini (you can configure which Journal Entry to send by giving its UUID in settings. The text from all of its pages will be sent to Gemini as context.)

## Usage Examples

### Public Questions - Everyone Sees Everything
Use `/?` when you want to share the AI response with all players at the table.

```
/? what's the cost of standing up from prone?
```
**Visible to:** All players  
**Response:** Standing up from prone costs half of your movement speed.

### Private Questions - Only You and GM
Use `/w gemini` for questions you don't want players to see (plot details, damage calculations, secrets). Only the sender and GM will see both the question and response.

```
/w gemini time to don and doff armor
```
**Visible to:** Sender + GM  
**Response:** According to the rules in the Player's Handbook, donning and doffing armor takes:

| Armor Type   | Donning Time | Doffing Time |
| ------------ | ------------ | ------------ |
| Light Armor  | 1 minute     | 1 minute     |
| Medium Armor | 5 minutes    | 1 minute     |
| Heavy Armor  | 10 minutes   | 5 minutes    |
| Shield       | 1 action     | 1 action     |

**Include specific players:** You can also whisper to specific players by name:
```
/w [gemini, PlayerName] can I counterspell this effect?
```

## Features

### Game System Support
Built-in support for D&D 5e, Pathfinder 2e and generic systems. Customize prompts for any ruleset.

### Context Management
Maintain conversation history across multiple turns. Adjust context window size to balance memory and token usage.

### Flexible Configuration
- Select model version (Gemini 3 Pro, Gemini 3 Flash, Gemini 2.5 Flash)
- Customize system prompts for your campaign
- Configure context length for conversation memory
- Configure max token count to limit the response length to not read walls of text, and conserve tokens

## How It Works

The module intercepts `/?` and `/w gemini` commands in Foundry VTT chat and sends them to your chosen Google Gemini API. Responses are formatted with proper Markdown support and integrated into your game's chat log.

Your custom prompts determine how the AI behaves—whether it acts as a knowledgeable GM assistant, rules adjudicator, or creative inspiration engine. The AI understands rulesets for popular game systems but always benefits from additional context in custom prompts.

> **💡 Security Tip:** Like all Foundry modules, settings are visible to players with console access. For shared games, we recommend creating a dedicated Google Gemini API key with spending limits. This way you can safely share AI features while controlling costs.

## Settings Guide

### Personal Mode Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **Google Gemini API Key** | Your OpenAI API key (required). Generate at [Google AIStudio](https://aistudio.google.com/app/apikey) | - |
| **Game System** | Auto-detect or choose: D&D 5e, Pathfinder 2e or Generic | Auto-detect |
| **Custom Prompt** | Optional. Replaces the Game system prompt to customize AI behavior | System default |
| **Gemini Model Version** | Choose the Gemini model. Higher versions give better results but cost more | gemini-3-flash |
| **Max Token Count** | Limits the number of tokens for a response. This prevents it from dumping walls of text by controlling the max output and controls token spending. You can adjust it to the number that suits you. | 1000 |
| **Context Length** | Number of recent messages AI remembers (0-50). Per-user, resets on page reload | 5 |


## Acknowledgements

**Special thanks to:**
- [Marc Costa](https://github.com/marccosta12) - Maintainer of the GPT Version this was forked from. Added Assistants API support, refactored architecture, and ongoing development.
- [Nikolay Vizovitin](https://github.com/vizovitin) - Built the foundation that made this project possible
- [Google](https://google.com) - For incredible AI tools
- [Foundry VTT](https://foundryvtt.com) community - For the amazing platform
