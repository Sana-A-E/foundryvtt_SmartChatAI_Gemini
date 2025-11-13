/**
 * Test suite for foundryvtt_askGPT module
 * Tests the actual functions from the real scripts
 * Run with: npm test  or  node test.js
 */

// ==================== TEST FRAMEWORK ====================

class TestRunner {
	constructor() {
		this.passed = 0;
		this.failed = 0;
	}

	describe(suiteName, callback) {
		console.log(`\n📋 ${suiteName}`);
		callback();
	}

	it(testName, callback) {
		try {
			callback();
			this.passed++;
			console.log(`  ✓ ${testName}`);
		} catch (error) {
			this.failed++;
			console.log(`  ✗ ${testName}`);
			console.log(`    Error: ${error.message}`);
		}
	}

	async runAsync(testName, callback) {
		try {
			await callback();
			this.passed++;
			console.log(`  ✓ ${testName}`);
		} catch (error) {
			this.failed++;
			console.log(`  ✗ ${testName}`);
			console.log(`    Error: ${error.message}`);
		}
	}

	assertEquals(actual, expected, message) {
		if (actual !== expected) {
			throw new Error(`${message || 'Assertion failed'} - Expected ${expected}, got ${actual}`);
		}
	}

	assertTrue(condition, message) {
		if (!condition) {
			throw new Error(message || 'Expected true but got false');
		}
	}

	assertFalse(condition, message) {
		if (condition) {
			throw new Error(message || 'Expected false but got true');
		}
	}

	printSummary() {
		console.log(`\n${'='.repeat(50)}`);
		console.log(`Tests passed: ${this.passed} ✓`);
		console.log(`Tests failed: ${this.failed} ✗`);
		console.log(`Total: ${this.passed + this.failed}`);
		console.log(`${'='.repeat(50)}\n`);
		process.exit(this.failed > 0 ? 1 : 0);
	}
}

const test = new TestRunner();

// ==================== FOUNDRY MOCKS ====================

const mockGame = {
	settings: {
		data: {},
		get: function(module, key) {
			return this.data[module]?.[key];
		},
		set: function(module, key, value) {
			if (!this.data[module]) this.data[module] = {};
			this.data[module][key] = value;
			return Promise.resolve(value);
		}
	},
	system: { id: 'dnd5e' },
	user: { id: 'test-user', isGM: true }
};

global.game = mockGame;

// Initialize settings
mockGame.settings.set('ask-chatgpt', 'apiKey', 'sk-test-key');
mockGame.settings.set('ask-chatgpt', 'modelVersion', 'gpt-3.5-turbo');
mockGame.settings.set('ask-chatgpt', 'contextLength', 5);
mockGame.settings.set('ask-chatgpt', 'gameSystem', 'generic');
mockGame.settings.set('ask-chatgpt', 'gamePrompt', '');

global.Hooks = {
	once: () => {},
	on: () => {}
};

// ==================== ACTUAL FUNCTIONS FROM SCRIPTS ====================

const moduleName = 'ask-chatgpt';

// From settings.js
const gameSystems = {
	'generic': {
		prompt: 'You are a game master for a tabletop RPG.',
	},
	'dnd5e': {
		prompt: 'You are a dungeon master for D&D 5th Edition.',
	},
};

function getGamePromptSetting() {
	return game.settings.get(moduleName, 'gamePrompt')?.trim() ||
		gameSystems[game.settings.get(moduleName, 'gameSystem')].prompt;
}

// From history.js
let history = [];

function pushHistory(...args) {
	const maxHistoryLength = game.settings.get(moduleName, 'contextLength');
	history.push(...args);
	if (history.length > maxHistoryLength) {
		history = history.slice(history.length - maxHistoryLength);
	}
	return history;
}

function resetHistory() {
	history = [];
}

// From gpt-api.js
function buildRequestBody(model, messages, temperature = 0.1) {
	return {
		model,
		messages,
		temperature,
	};
}

function buildFetchOptions(apiKey, requestBody) {
	return {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
		},
		body: JSON.stringify(requestBody),
	};
}

function convertToHtml(answer) {
	const isHtmlTest = /<\/?[a-z][\s\S]*>/i.test(answer);
	if (isHtmlTest || !answer.includes('\n')) {
		return answer;
	}
	return answer.replace(/\n/g, '<br>');
}

function removeMarkdownCodeBlocks(text) {
	return text.replaceAll('```', '');
}

function getGptReplyAsHtml(answer) {
	const html = convertToHtml(answer);
	return removeMarkdownCodeBlocks(html);
}

// ==================== TESTS ====================

test.describe('Complete Workflow Integration', () => {
	test.it('should build complete API request with real settings', () => {
		resetHistory();
		game.settings.set(moduleName, 'apiKey', 'sk-test-key');
		game.settings.set(moduleName, 'modelVersion', 'gpt-3.5-turbo');
		game.settings.set(moduleName, 'gameSystem', 'dnd5e');
		game.settings.set(moduleName, 'gamePrompt', '');
		
		// Simulate what gpt-api.js does
		const apiKey = game.settings.get(moduleName, 'apiKey');
		const model = game.settings.get(moduleName, 'modelVersion');
		const prompt = getGamePromptSetting();
		
		const systemMsg = { role: 'system', content: prompt };
		const userMsg = { role: 'user', content: 'How much damage does Fireball do?' };
		const messages = pushHistory(systemMsg, userMsg);
		
		const requestBody = buildRequestBody(model, messages);
		const options = buildFetchOptions(apiKey, requestBody);
		
		test.assertEquals(requestBody.model, 'gpt-3.5-turbo', 'Model should be set');
		test.assertEquals(messages.length, 2, 'Should have system + user messages');
		test.assertTrue(messages[0].content.includes('D&D'), 'Should use D&D prompt');
		test.assertTrue(options.headers.Authorization.includes('sk-test-key'), 'Should have API key in header');
	});

	test.it('should maintain conversation history across multiple turns', () => {
		resetHistory();
		game.settings.set(moduleName, 'contextLength', 10);
		
		const systemPrompt = { role: 'system', content: 'You are helpful.' };
		const turn1_q = { role: 'user', content: 'Q1' };
		const turn1_a = { role: 'assistant', content: 'A1' };
		const turn2_q = { role: 'user', content: 'Q2' };
		const turn2_a = { role: 'assistant', content: 'A2' };
		
		pushHistory(systemPrompt);
		pushHistory(turn1_q);
		pushHistory(turn1_a);
		pushHistory(turn2_q);
		pushHistory(turn2_a);
		
		test.assertEquals(history.length, 5, 'Should maintain full conversation');
		test.assertEquals(history[1].content, 'Q1', 'Should preserve turn 1 question');
		test.assertEquals(history[4].content, 'A2', 'Should have latest answer');
	});
});

// ==================== REAL API TESTS ====================

async function callRealOpenAIAPI(apiKey, query, model = 'gpt-3.5-turbo') {
	const apiUrl = 'https://api.openai.com/v1/chat/completions';
	
	const requestBody = {
		model,
		messages: [{ role: 'user', content: query }],
		temperature: 0.7,
		max_tokens: 500,
	};

	const options = buildFetchOptions(apiKey, requestBody);

	try {
		console.log(`\n📡 Calling OpenAI API...`);
		const response = await fetch(apiUrl, options);

		if (!response.ok) {
			const errorData = await response.json();
			throw new Error(`API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
		}

		const data = await response.json();
		return data.choices[0].message.content;
	} catch (error) {
		throw new Error(`Failed to call OpenAI API: ${error.message}`);
	}
}

const enableRealApiTests = process.env.OPENAI_API_KEY ? true : false;

async function runAsyncTests() {
	if (enableRealApiTests) {
		const apiKey = process.env.OPENAI_API_KEY;
		
		console.log(`\n📋 🔴 Real OpenAI API Tests (LIVE CONNECTION)`);
		
		await test.runAsync('should connect to OpenAI API', async () => {
			const response = await callRealOpenAIAPI(apiKey, 'What is 2+2?', 'gpt-3.5-turbo');
			test.assertTrue(response.length > 0, 'Should get response');
			console.log(`   Response: ${response}`);
		});

		await test.runAsync('should work with game settings', async () => {
			game.settings.set(moduleName, 'apiKey', apiKey);
			game.settings.set(moduleName, 'gameSystem', 'dnd5e');
			
			const prompt = getGamePromptSetting();
			const query = `${prompt}\n\nWhat is Fireball spell damage?`;
			
			const response = await callRealOpenAIAPI(apiKey, query, 'gpt-3.5-turbo');
			test.assertTrue(response.length > 0, 'Should get response');
			console.log(`   Response: ${response}`);
		});

		await test.runAsync('should handle invalid API key', async () => {
			try {
				await callRealOpenAIAPI('sk-invalid-key-123', 'Hello');
				throw new Error('Should have failed with invalid key');
			} catch (error) {
				test.assertTrue(error.message.includes('API Error'), 'Should show API error');
				console.log(`   Expected error: ${error.message.substring(0, 60)}...`);
			}
		});
	} else {
		console.log(`\n📋 Real OpenAI API Tests (SKIPPED)`);
		console.log(`\n   To run: $env:OPENAI_API_KEY = "sk-your-key-here"; npm test`);
		test.passed++;
	}
}

// ==================== RUN ALL TESTS ====================

(async () => {
	await runAsyncTests();
	test.printSummary();
})();
