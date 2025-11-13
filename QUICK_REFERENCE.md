# Quick Reference: Optional Assistants API

## ⚡ TL;DR

**Chat API (Default - No Configuration Needed)**
- Leave "OpenAI Assistant ID" empty
- Works like before
- Uses: gameSystem, modelVersion, gamePrompt

**Assistants API (Optional - Only if you want it)**
- Create Assistant at https://platform.openai.com/assistants
- Copy Assistant ID (looks like `asst_xxx...`)
- Paste into "OpenAI Assistant ID" field in module settings
- Ignores: gameSystem, modelVersion, gamePrompt

## 📋 Settings (In Foundry VTT)

| Setting | Required? | Used When |
|---------|-----------|-----------|
| API Key | ✅ Always | Both Chat and Assistant APIs |
| Model Version | ✅ Only if Assistant ID is empty | Chat API only |
| Game System | ✅ Only if Assistant ID is empty | Chat API only |
| Game Prompt | ❌ Optional | Chat API only (if empty, uses game system defaults) |
| **Assistant ID** | ❌ Optional (NEW) | Assistants API (if filled, other settings ignored) |

## 🧪 Testing

```powershell
# Setup API key
$env:OPENAI_API_KEY = "sk-your-actual-key-here"

# Test 1: Unit tests (no API calls)
npm test
# Result: All 5 tests should pass ✅

# Test 2: Chat API with real OpenAI
npm run test:real
# Result: Tests callGptApi() function

# Test 3: Assistants API (requires Assistant ID from OpenAI)
$env:ASSISTANT_ID = "asst_xxxxxxxxxxxxxxxx"
npm run test:assistant
# Result: Tests callAssistantApi() with your Assistant
```

## 🔄 How It Works

### When using Chat API (default)
```
Your Question
    ↓
Module checks: Is assistantId set?
    ↓ NO
Use Chat API with:
  - gameSystem (dnd5e/pf2e/etc)
  - modelVersion (gpt-3.5-turbo/gpt-4)
  - gamePrompt (custom instructions)
    ↓
OpenAI Chat Completions API
    ↓
Response
```

### When using Assistants API (if Assistant ID is configured)
```
Your Question
    ↓
Module checks: Is assistantId set?
    ↓ YES
Use Assistants API with:
  - assistantId (your pre-created Assistant)
  - apiKey
  - Ignores gameSystem, modelVersion, gamePrompt
    ↓
OpenAI Assistants API
  (Creates thread → Adds message → Runs assistant → Waits for response)
    ↓
Response
```

## ✅ Verification Checklist

- [x] All tests passing
- [x] Settings properly configured
- [x] Module router working correctly
- [x] Both APIs implemented and tested
- [x] Documentation updated
- [x] Backward compatible

## 🎯 Development Files

| File | Purpose | Status |
|------|---------|--------|
| `scripts/gpt-api.js` | Chat API implementation | ✅ Unchanged |
| `scripts/assistant-api.js` | Assistants API implementation | ✅ Updated |
| `scripts/module.js` | Router between APIs | ✅ Updated |
| `scripts/settings.js` | Settings registration | ✅ Updated |
| `test.js` | Unit tests | ✅ Fixed |
| `test-real-api.js` | Chat API integration tests | ✅ Ready |
| `test-assistant.js` | Assistants API integration tests | ✅ Updated |
| `ASSISTANTS.md` | Detailed documentation | ✅ Updated |
| `IMPLEMENTATION_SUMMARY.md` | This implementation summary | ✅ Created |

## 📞 Common Questions

**Q: Do I have to use Assistants API?**
A: No! Leave the "OpenAI Assistant ID" field empty to use the Chat API (default).

**Q: What's the difference?**
A: Chat API is faster and stateless. Assistants API is slower but can have more advanced tools.

**Q: How do I create an Assistant?**
A: Go to https://platform.openai.com/assistants and click "Create".

**Q: Will my old settings stop working?**
A: No! Backward compatible. Chat API works exactly as before.

**Q: Can I switch between Chat and Assistants?**
A: Yes! Just add/remove the Assistant ID in settings.

**Q: What happens to my game prompt when using Assistants?**
A: It's ignored. Configure your Assistant's instructions instead.

## 🚀 Next Steps

1. **Test locally**: `npm test` (all should pass)
2. **Test Chat API**: `$env:OPENAI_API_KEY="sk-..."; npm run test:real`
3. **Deploy to Foundry**: Place module in Data/modules/
4. **Configure in Foundry**: Add API key to settings
5. **Use Chat API**: Leave Assistant ID empty
6. **Or use Assistants**: Add your Assistant ID to settings

## 📝 Code Examples

**Using Chat API (from Foundry):**
```javascript
// In your Foundry macro or module
const reply = await game.modules.get('ask-chatgpt').api.respondTo('Your question');
// Uses gameSystem, modelVersion, gamePrompt from settings
```

**Using Assistants API (from Foundry):**
```javascript
// Configure in settings first: assistantId = "asst_..."
const reply = await game.modules.get('ask-chatgpt').api.respondTo('Your question');
// Uses your Assistant, ignores other settings
```

**Testing Chat API directly (Node.js):**
```javascript
const { callGptApi } = await import('./scripts/gpt-api.js');
const response = await callGptApi('Your question');
```

**Testing Assistants API directly (Node.js):**
```javascript
const { callAssistantApi } = await import('./scripts/assistant-api.js');
const response = await callAssistantApi('Your question', 'asst_xxx...', 'sk-...');
```
