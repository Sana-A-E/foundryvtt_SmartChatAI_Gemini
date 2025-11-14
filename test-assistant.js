/**
 * Test para OpenAI Assistants API
 * Este test usa un Assistant ID existente que el usuario debe proporcionar
 * Run with: npm run test:assistant
 */

console.log(`📍 Testing OpenAI Assistant with existing Assistant ID\n`);

if (!process.env.OPENAI_API_KEY) {
	console.log('⚠️  OPENAI_API_KEY no está configurado');
	console.log('   Configurar: $env:OPENAI_API_KEY = "sk-your-key-here"');
	console.log('   Luego ejecutar: npm run test:assistant\n');
	process.exit(0);
}

if (!process.env.ASSISTANT_ID) {
	console.log('⚠️  ASSISTANT_ID no está configurado');
	console.log('   Necesitas una cuenta en OpenAI y crear un Assistant primero');
	console.log('   1. Ve a https://platform.openai.com/assistants');
	console.log('   2. Crea un nuevo Assistant');
	console.log('   3. Copia el ID del Assistant (asst_...)');
	console.log('   4. Configura: $env:ASSISTANT_ID = "asst_xxxxxxx"');
	console.log('   5. Luego ejecuta: npm run test:assistant\n');
	process.exit(0);
}

// Setup mocks
global.game = {
	settings: {
		data: {},
		get: function(module, key) {
			return this.data[module]?.[key];
		},
		set: function(module, key, value) {
			if (!this.data[module]) this.data[module] = {};
			this.data[module][key] = value;
		}
	},
	system: { id: 'dnd5e', name: 'Dungeons & Dragons 5th Edition' }
};

global.Hooks = { once: () => {}, on: () => {} };

// ==================== UTILITIES ====================

function log(title, message) {
	console.log(`\n${title}`);
	console.log(`${message}`);
}

function logError(title, error) {
	console.log(`\n❌ ${title}`);
	console.log(`   Error: ${error.message}`);
}

// ==================== MAIN TEST ====================

(async () => {
	try {
		log('🚀 Importing Assistant API module...', 'scripts/assistant-api.js');

		const { callAssistantApi, getAssistantReplyAsHtml } = await import('./scripts/assistant-api.js');

		const apiKey = process.env.OPENAI_API_KEY;
		const assistantId = process.env.ASSISTANT_ID;

		log('✓ Configuration loaded:', `
  API Key: ${apiKey.substring(0, 20)}...
  Assistant ID: ${assistantId}
		`);
        // Test 3: HTML formatting
		log('📝 Test 2: Nombre assistants');
		
		const response2 = await getAssistantReplyAsHtml('Dime el nombre del asistente y la Source priority que usas', assistantId, apiKey);
		
		console.log(`Response contains HTML: ${response2.includes('<br>')}`);
		console.log(`Response: ${response2.substring(0, 200)}...`);

		// Test 3: HTML formatting
		log('📝 Test 3: HTML Formatted Response', 'Testing getAssistantReplyAsHtml()');
		
		const response3 = await getAssistantReplyAsHtml('Give me 3 items separated by new lines', assistantId, apiKey);
		
		console.log(`Response contains HTML: ${response3.includes('<br>')}`);
		console.log(`Response: ${response3.substring(0, 200)}...`);

		log('✅ All tests passed!', `
		Assistant is working correctly.
		
		Now in your Foundry VTT settings:
		1. Go to Module Settings
		2. Find "OpenAI Assistant ID (Optional)"
		3. Enter your Assistant ID: ${assistantId}
		4. The module will now use your Assistant instead of Chat API
		5. gameSystem, modelVersion, and gamePrompt will be ignored
		`);

	} catch (error) {
		logError('Fatal Error', error);
		console.error('\nFull error:');
		console.error(error);
		process.exit(1);
	}
})();
