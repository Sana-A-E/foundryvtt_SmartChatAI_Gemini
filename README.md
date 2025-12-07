# Smart Chat AI

Bring AI to your Foundry VTT table with powerful OpenAI integration. Whether you prefer simple Chat Completions or sophisticated Assistants with custom knowledge bases, this module adapts to your needs.

![Foundry VTT 10](https://img.shields.io/badge/Foundry_VTT-v10-informational?style=flat-square) ![GitHub all releases downloads](https://img.shields.io/github/downloads/marccosta12/foundryvtt_SmartChatAI/total?label=downloads%40total&style=flat-square) ![GitHub latest release downloads](https://img.shields.io/github/downloads/marccosta12/foundryvtt_SmartChatAI/latest/total?style=flat-square) ![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/marccosta12/foundryvtt_SmartChatAI/ci.yml?label=ci&logo=github&style=flat-square)

## Quick Start

1. **Get your API key** from [OpenAI](https://platform.openai.com/account/api-keys)
2. **Install the module** using: `https://github.com/marccosta12/foundryvtt_SmartChatAI/releases/latest/download/module.json`
3. **Configure settings** with your API key and preferred AI engine
4. **Start asking!** Use `/?` or `/w gpt` in chat

## Usage Examples

### Public Questions (Visible to Everyone)
```
/? what's the cost of standing up from prone?
```
**Response:** Standing up from prone costs half of your movement speed.

### Private Whispers (DM & Sender Only)
```
/w [gpt, gm] time to don and doff armor
```
**Response:** According to the rules in the Player's Handbook, donning and doffing armor takes:

| Armor Type   | Donning Time | Doffing Time |
| ------------ | ------------ | ------------ |
| Light Armor  | 1 minute     | 1 minute     |
| Medium Armor | 5 minutes    | 1 minute     |
| Heavy Armor  | 10 minutes   | 5 minutes    |
| Shield       | 1 action     | 1 action     |

## Features

### Two AI Modes
- **Chat Completions API** - Fast, lightweight, great for quick rules lookups and inspiration
- **Assistants API** - Powerful, with custom knowledge bases and persistent context (bring your own Assistant ID)

### Game System Support
Built-in support for D&D 5e, Pathfinder 2e and generic systems. Customize prompts for any ruleset.

### Context Management
Maintain conversation history across multiple turns. Adjust context window size to balance memory and token usage.

### Flexible Configuration
- Select model version (GPT-4o, GPT-4o Mini, or GPT-3.5)
- Customize system prompts for your campaign
- Configure context length for conversation memory
- Optional: Use your custom OpenAI Assistant for advanced features

## How It Works

The module intercepts `/?` and `/w gpt` commands in Foundry VTT chat and sends them to your chosen OpenAI API. Responses are formatted with proper Markdown support and integrated into your game's chat log.

Your custom prompts determine how the AI behaves—whether it acts as a knowledgeable GM assistant, rules adjudicator, or creative inspiration engine. The AI understands rulesets for popular game systems but always benefits from additional context in custom prompts.

> **💡 Security Tip:** Like all Foundry modules, settings are visible to players with console access. For shared games, we recommend creating a dedicated OpenAI API key with spending limits at [OpenAI Dashboard](https://platform.openai.com/settings/organization/limits). This way you can safely share AI features while controlling costs.

## Settings Guide

### Personal Mode Settings
| Setting | Description | Default |
|---------|-------------|---------|
| **OpenAI API Key** | Your OpenAI API key (required). Generate at [OpenAI Platform](https://platform.openai.com/account/api-keys) | - |
| **Game System** | Auto-detect or choose: D&D 5e, Pathfinder 2e or Generic | Auto-detect |
| **Custom Prompt** | Optional. Replaces the Game system prompt to customize AI behavior | System default |
| **GPT Model Version** | Choose the OpenAI model. Higher versions give better results but cost more | gpt-4o-mini |
| **Context Length** | Number of recent messages AI remembers (0-50). Per-user, resets on page reload | 5 |
| **OpenAI Assistant ID** | Advanced. Uses your custom OpenAI Assistant. See [Using Assistants](#using-assistants) below | - |

### Using Assistants

Don't have an Assistant? Create one on [OpenAI Platform](https://platform.openai.com/assistants):

## Acknowledgements

**Maintainer:** [Marc Costa](https://github.com/marccosta12) - Added Assistants API support, refactored architecture, and ongoing development.

**Special thanks to:**
- [Nikolay Vizovitin](https://github.com/vizovitin) - Built the foundation that made this project possible
- [OpenAI](https://openai.com) - For incredible AI tools
- [Foundry VTT](https://foundryvtt.com) community - For the amazing platform
