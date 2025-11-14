# 📚 Resumen de Scripts

## 📋 Descripción General

El módulo de Foundry VTT Ask ChatGPT está dividido en 5 scripts principales que trabajan juntos para proporcionar integración con OpenAI.

---

## 🎯 **1. module.js** - Punto de Entrada Principal

**¿Qué hace?**
- Escucha mensajes de chat en Foundry VTT
- Detecta comandos para GPT (`/? pregunta` o `/w gpt pregunta`)
- Enruta las preguntas al API correcto (Chat o Assistants)
- Crea respuestas formateadas en el chat

**Funciones clave:**
- `Hooks.once('init')` - Inicializa el módulo y registra settings
- `Hooks.on('chatMessage')` - Escucha mensajes de chat
- Detecta `/? pregunta` (chat público)
- Detecta `/w gpt pregunta` (whisper privado)
- `respondTo(question, users)` - Procesa la pregunta y elige qué API usar

**Flujo:**
```
Usuario escribe en chat
    ↓
¿Es /? o /w gpt?
    ├─ Sí → Extrae pregunta
    │       ↓
    │       ¿Hay assistantId configurado?
    │       ├─ Sí → Usa Assistants API
    │       └─ No → Usa Chat Completions API
    │       ↓
    │       Envía respuesta al chat
    │
    └─ No → Ignora mensaje
```

---

## ⚙️ **2. settings.js** - Configuración del Módulo

**¿Qué hace?**
- Define todas las configuraciones disponibles en Foundry
- Registra los settings en Foundry VTT
- Proporciona funciones para obtener configuración
- Almacena sistemas de juego predefinidos con prompts especializados

**Configuraciones disponibles:**
1. **apiKey** - Tu clave API de OpenAI (encriptada)
2. **modelVersion** - Versión del modelo (GPT-4 o GPT-3.5)
3. **contextLength** - Número de mensajes a recordar (0-50)
4. **gameSystem** - Sistema de juego (D&D 5e, Pathfinder, etc.)
5. **gamePrompt** - Prompt personalizado (opcional)
6. **assistantId** - ID del Assistant (opcional, nuevo)

**Sistemas de juego soportados:**
- **generic** - RPG genérico
- **dnd5e** - Dungeons & Dragons 5th Edition
- **pf2e** - Pathfinder 2nd Edition
- **foundry-ironsworn** - Ironsworn

**Funciones exportadas:**
- `registerSettings()` - Registra todos los settings
- `getGamePromptSetting()` - Obtiene el prompt del sistema actual
- `moduleName` - Nombre del módulo ('ask-chatgpt')
- `gameSystems` - Objeto con prompts predefinidos

---

## 🤖 **3. gpt-api.js** - Chat Completions API (OpenAI)

**¿Qué hace?**
- Realiza llamadas a OpenAI Chat Completions API
- Maneja el historial de conversación
- Reintentos automáticos si falla la API
- Convierte respuestas a HTML

**Funciones clave:**
- `callGptApi(query)` - Realiza llamada a OpenAI
  - Obtiene apiKey, model, prompt de settings
  - Construye array de mensajes (historial + prompt + pregunta)
  - Realiza hasta 5 intentos con backoff exponencial
  - Registra respuesta en historial
  
- `getGptReplyAsHtml(query)` - Envuelve respuesta en HTML
  - Convierte saltos de línea en `<br>`
  - Elimina bloques de código markdown (```)

**Flujo de una llamada:**
```
1. Obtiene config (API Key, modelo, prompt, historial)
2. Construye payload JSON
3. Envía POST a https://api.openai.com/v1/chat/completions
4. Si falla (400-499): error inmediato
5. Si falla (otros): reintentos con espera exponencial
6. Parsea respuesta JSON
7. Guarda pregunta y respuesta en historial
8. Devuelve respuesta limpia
```

**Parámetros de la API:**
- temperature: 0.1 (respuestas más deterministas)
- model: gpt-4 o gpt-3.5-turbo
- messages: historial + sistema + usuario

---

## 💾 **4. history.js** - Gestión del Historial

**¿Qué hace?**
- Mantiene en memoria el historial de conversación
- Limita el historial a N mensajes configurados
- Proporciona historial para cada nueva llamada

**Funciones clave:**
- `pushHistory(...args)` - Agrega mensajes al historial
  - Acepta múltiples argumentos (mensajes)
  - Limita tamaño según `contextLength` setting
  - Devuelve historial actualizado

**Estructura de mensajes:**
```javascript
{
  role: 'user' | 'assistant',
  content: 'Texto del mensaje'
}
```

**Limitaciones:**
- Historial se resetea al recargar la página
- No está sincronizado entre usuarios (cada GM tiene su propio historial)
- El límite se configura en settings (0-50 mensajes)

---

## 🎬 **5. assistant-api.js** - OpenAI Assistants API (NUEVO)

**¿Qué hace?**
- Usa OpenAI Assistants API en lugar de Chat Completions
- Requiere un Assistant ID existente creado por el usuario
- Gestiona threads (conversaciones)
- No crea Assistants automáticamente

**Funciones clave:**

1. **createThread(apiKey)** - Crea nuevo thread
   - POST a `/v1/threads`
   - Devuelve threadId

2. **addMessageToThread(apiKey, threadId, message)** - Añade mensaje
   - POST a `/v1/threads/{id}/messages`
   - Role: 'user'

3. **runAssistant(apiKey, threadId, assistantId)** - Ejecuta assistant
   - POST a `/v1/threads/{id}/runs`
   - Devuelve runId

4. **waitForRunCompletion(apiKey, threadId, runId)** - Espera respuesta
   - GET a `/v1/threads/{id}/runs/{id}`
   - Polling máximo 30 segundos

5. **getLatestMessage(apiKey, threadId)** - Obtiene respuesta
   - GET a `/v1/threads/{id}/messages`
   - Devuelve último mensaje del assistant

6. **callAssistantApi(query, assistantId, apiKey)** - Flujo completo
   - Crea thread
   - Añade mensaje
   - Ejecuta assistant
   - Espera completación
   - Devuelve respuesta

7. **getAssistantReplyAsHtml(query, assistantId, apiKey)** - Envuelve en HTML
   - Convierte saltos de línea en `<br>`
   - Elimina markdown code blocks

**Flujo de una llamada:**
```
1. Crea thread nuevo
   ↓
2. Añade pregunta al thread
   ↓
3. Ejecuta assistant en thread
   ↓
4. Polling hasta que complete (máx 30s)
   ↓
5. Obtiene último mensaje (respuesta)
   ↓
6. Devuelve respuesta formateada
```

---

## 🔄 Cómo Trabajan Juntos

```
┌─────────────────────────────────────┐
│ Usuario en Foundry VTT              │
│ Escribe: /? ¿Cuánto daño hace...?  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ module.js - Escucha chatMessage     │
│ Detecta /? y extrae pregunta        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ settings.js - Obtiene configuración │
│ ¿Hay assistantId? ¿Cuál es apiKey?  │
└────────────┬────────────────────────┘
             │
        ┌────┴─────┐
        │           │
    ¿Asst ID?    ¿Chat API?
        │           │
        ▼           ▼
   assistant-api  gpt-api
     .js            .js
        │           │
        └───┬───────┘
            │
            ▼
┌─────────────────────────────────────┐
│ history.js - Registra conversación  │
│ Guarda pregunta y respuesta          │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│ module.js - Crea ChatMessage        │
│ Muestra respuesta en el chat         │
└─────────────────────────────────────┘
```

---

## 📊 Comparativa: Chat API vs Assistants API

| Característica | Chat API (gpt-api.js) | Assistants (assistant-api.js) |
|---|---|---|
| **Velocidad** | Rápido (1-3s) | Lento (5-15s, con polling) |
| **Configuración** | Automática en settings | Usuario proporciona ID |
| **Prompt personalizado** | Sí (gamePrompt) | No (usa instrucciones del Assistant) |
| **Historial** | En memoria, limitado | No persistente (thread por llamada) |
| **Costo** | Más barato | Un poco más caro |
| **Herramientas** | No | Sí (Code Interpreter, etc.) |
| **Auto-creación** | N/A | No (usuario crea en OpenAI) |

---

## 🛠️ Flujos Típicos

### Flujo Chat API
```javascript
Usuario pregunta
    ↓
module.js detecta y llama respondTo()
    ↓
settings.js devuelve apiKey, modelo, prompt
    ↓
history.js proporciona historial
    ↓
gpt-api.js hace POST a OpenAI
    ↓
history.js registra pregunta y respuesta
    ↓
module.js crea ChatMessage en Foundry
```

### Flujo Assistants API
```javascript
Usuario pregunta
    ↓
module.js detecta assistantId en settings
    ↓
assistant-api.js crea thread
    ↓
assistant-api.js añade mensaje al thread
    ↓
assistant-api.js ejecuta assistant
    ↓
assistant-api.js espera completación (polling)
    ↓
assistant-api.js obtiene respuesta
    ↓
module.js crea ChatMessage en Foundry
```

---

## 🔑 Conceptos Importantes

### API Key
- Obtenida de https://platform.openai.com/account/api-keys
- Guardada encriptada en Foundry
- Usada en cada llamada a OpenAI

### Thread (Assistants)
- Conversación entre usuario y assistant
- Creado de nuevo en cada llamada (no persistente)
- Máximo 30 segundos de espera

### Run (Assistants)
- Ejecución del assistant en un thread
- Status posibles: queued, in_progress, completed, failed

### Historial (Chat API)
- Mensajes previos de la conversación
- Limitado por contextLength setting
- Resetea al recargar Foundry

### Prompt
- Instrucciones al modelo
- Diferente para cada sistema de juego
- Personalizable en settings

---

## 📝 Notas de Desarrollo

- **Imports**: Todos usan módulos ES6 (`import`/`export`)
- **Async/Await**: Todas las operaciones de API son asincrónicas
- **Error Handling**: Chat API reintentos automáticos, Assistants sin reintentos
- **Logging**: Debug logs disponibles en consola del navegador
- **Testing**: Ver test.js, test-real-api.js, test-assistant.js
