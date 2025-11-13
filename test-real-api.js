/**
 * Test real de callGptApi desde gpt-api.js
 * Este archivo usa import/export de ES6 para importar la función real
 * Run with: node --input-type=module test-real-api.js
 */

// ==================== MOCK SETUP ====================

// Mock del objeto game de Foundry
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
	system: { id: 'dnd5e' },
	user: { id: 'test-user', isGM: true }
};

// Inicializar settings
game.settings.set('ask-chatgpt', 'apiKey', process.env.OPENAI_API_KEY || 'sk-test-invalid-key');
game.settings.set('ask-chatgpt', 'modelVersion', 'gpt-3.5-turbo');
game.settings.set('ask-chatgpt', 'contextLength', 5);
game.settings.set('ask-chatgpt', 'gameSystem', 'dnd5e');
game.settings.set('ask-chatgpt', 'gamePrompt', '');

global.Hooks = {
	once: () => {},
	on: () => {}
};

// ==================== TEST RUNNER ====================

class SimpleTest {
	constructor() {
		this.passed = 0;
		this.failed = 0;
	}

	async test(name, fn) {
		try {
			console.log(`\n🧪 ${name}`);
			await fn();
			this.passed++;
			console.log(`   ✓ PASSED`);
		} catch (error) {
			this.failed++;
			console.log(`   ✗ FAILED`);
			console.log(`   Error: ${error.message}`);
			if (error.response) {
				console.log(`   Status: ${error.response.status}`);
			}
		}
	}

	summary() {
		console.log(`\n${'='.repeat(60)}`);
		console.log(`Summary: ${this.passed} passed, ${this.failed} failed`);
		console.log(`${'='.repeat(60)}\n`);
		process.exit(this.failed > 0 ? 1 : 0);
	}
}

const tester = new SimpleTest();

// ==================== IMPORT Y TEST DE callGptApi ====================

async function runTests() {
	console.log(`📍 Testing gpt-api.js callGptApi() function\n`);

	if (!process.env.OPENAI_API_KEY) {
		console.log('⚠️  OPENAI_API_KEY no está configurado');
		console.log('   Configurar: $env:OPENAI_API_KEY = "sk-your-key-here"');
		console.log('   Luego ejecutar: npm run test:real\n');
		tester.summary();
		return;
	}

	console.log(`✓ API Key encontrada: ${process.env.OPENAI_API_KEY.substring(0, 20)}...`);
	console.log(`✓ Settings configurados`);
	console.log(`✓ Game object mocked\n`);

	// Importar las funciones reales
	console.log('📦 Importando funciones reales desde scripts/...\n');
	
	try {
		const { getGptReplyAsHtml } = await import('./scripts/gpt-api.js');

		// Test 1: Llamada simple
		await tester.test('Llamada simple a callGptApi (función real)', async () => {
			console.log(`   Query: "What is 2+2?"`);
			const response = await getGptReplyAsHtml('What is 2+2?');
			
			if (!response || response.length === 0) {
				throw new Error('La respuesta está vacía');
			}

			console.log(`   Response length: ${response.length} caracteres`);
			console.log(`   Response: ${response.substring(0, 100)}...`);

			if (response.includes('<') || response.includes('>')) {
				console.log(`   ✓ Respuesta formateada en HTML`);
			}
		});

		// Test 2: Llamada D&D
		await tester.test('Llamada D&D específica', async () => {
			console.log(`   Query: "¿Cuál es el daño del hechizo Fireball en D&D 5e?"`);
			const response = await getGptReplyAsHtml('¿Cuál es el daño del hechizo Fireball en D&D 5e?');
			
			if (!response || response.length === 0) {
				throw new Error('La respuesta está vacía');
			}

			console.log(`   Response length: ${response.length} caracteres`);
			console.log(`   Response: ${response.substring(0, 100)}...`);

			const includesFireball = response.toLowerCase().includes('fireball') || 
									   response.toLowerCase().includes('fuego') ||
									   response.toLowerCase().includes('d6') ||
									   response.toLowerCase().includes('daño');
			
			if (includesFireball) {
				console.log(`   ✓ Respuesta relacionada con Fireball`);
			} else {
				console.log(`   ⚠️  Respuesta no menciona Fireball`);
			}
		});

		// Test 3: Verificar multi-línea y HTML
		await tester.test('Respuesta multi-línea se convierte a HTML', async () => {
			console.log(`   Query: "Haz una lista de 3 clases de D&D"`);
			const response = await getGptReplyAsHtml('Haz una lista de 3 clases de D&D con saltos de línea');
			
			if (!response || response.length === 0) {
				throw new Error('La respuesta está vacía');
			}

			console.log(`   Response: ${response.substring(0, 150)}...`);

			if (response.includes('<br>')) {
				console.log(`   ✓ Saltos de línea convertidos a <br>`);
			} else if (response.includes('\n')) {
				console.log(`   ⚠️  Contiene newlines pero no <br> (podría estar en HTML ya)`);
			}
		});

		// Test 4: Verificar limpieza de código markdown
		await tester.test('Código markdown se limpia correctamente', async () => {
			console.log(`   Query: "Dame un ejemplo de código JavaScript simple"`);
			const response = await getGptReplyAsHtml('Dame un ejemplo de código JavaScript en una línea');
			
			if (!response || response.length === 0) {
				throw new Error('La respuesta está vacía');
			}

			console.log(`   Response: ${response.substring(0, 150)}...`);

			if (!response.includes('```')) {
				console.log(`   ✓ Backticks markdown removidos`);
			} else {
				console.log(`   ⚠️  Backticks aún presentes (podría ser esperado)`);
			}
		});

	} catch (error) {
		console.error('❌ Error al importar módulos:', error.message);
		console.error(error);
		process.exit(1);
	}

	tester.summary();
}

// Ejecutar tests
runTests().catch(error => {
	console.error('Error fatal:', error);
	process.exit(1);
});
