# Solução: Usar Provider Anthropic ao invés de OpenAI

## 🎯 Problema Identificado

O erro persiste porque:
1. O provider **OpenAI** usa API de Responses (`/v1/responses`)
2. O provider **Anthropic** usa API de Chat padrão (`streamText`)
3. LiteLLM tem melhor compatibilidade com a API de Chat

## ✅ Solução Inteligente

Usar o **provider Anthropic** do AFFiNE apontando para o LiteLLM.

### Por que funciona melhor?

```typescript
// OpenAI Provider (problemático):
const modelInstance = 'responses' in this.#instance
  ? this.#instance.responses(model.id)  // ❌ Usa /v1/responses
  : this.#instance(model.id);

// Anthropic Provider (melhor):
const { fullStream } = streamText({
  model: this.instance(model.id),  // ✅ Usa streamText direto
  // ...
});
```

O provider Anthropic **não tem** a lógica de responses API!

## 🔧 Configuração

### 1. Admin Panel → AI

**Anthropic Provider:**
```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

**OpenAI Provider (deixar vazio):**
```json
{
  "apiKey": "",
  "baseURL": "https://api.openai.com/v1"
}
```

**Custom Models:**
```json
{
  "override_enabled": true,
  "scenarios": {
    "audio_transcribing": "claude-4-5-haiku",
    "chat": "claude-4-5-haiku",
    "embedding": "titan-embed-text",
    "image": "claude-4-5-haiku",
    "rerank": "claude-4-5-haiku",
    "coding": "claude-4-5-haiku",
    "complex_text_generation": "claude-4-5-haiku",
    "quick_decision_making": "claude-4-5-haiku",
    "quick_text_generation": "claude-4-5-haiku",
    "polish_and_summarize": "claude-4-5-haiku"
  }
}
```

### 2. LiteLLM Config

O LiteLLM já está configurado corretamente. Não precisa mudar nada.

## 🚀 Vantagens

1. ✅ **Sem API de Responses** - Usa streamText padrão
2. ✅ **Melhor compatibilidade** - LiteLLM suporta melhor
3. ✅ **Código nativo** - Usa provider oficial do AFFiNE
4. ✅ **Sem modificações** - Não precisa alterar código fonte

## ⚠️ Limitação

O provider Anthropic do AFFiNE espera que o endpoint seja compatível com a API da Anthropic. O LiteLLM precisa traduzir corretamente.

### Teste se LiteLLM suporta formato Anthropic:

```bash
curl http://localhost:4000/v1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-4-5-haiku",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 100
  }'
```

Se funcionar, o provider Anthropic é a solução!

## 🔄 Alternativa: OpenAI Compatible Provider

Se o Anthropic não funcionar, podemos usar `createOpenAICompatible` que força uso de chat API:

```typescript
// Isso já existe no código do AFFiNE
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const instance = createOpenAICompatible({
  baseURL: 'http://localhost:4000/v1',
  apiKey: 'sk-affine-dev-key',
});
```

Mas isso requer modificação do código.

## 📊 Comparação de Soluções

| Solução | Modificação Código | Compatibilidade | Complexidade |
|---------|-------------------|-----------------|--------------|
| Provider Anthropic | ❌ Não | ⚠️ Depende LiteLLM | ⭐ Baixa |
| Forçar Chat API | ✅ Sim | ✅ Alta | ⭐⭐ Média |
| OpenAI Compatible | ✅ Sim | ✅ Alta | ⭐⭐⭐ Alta |
| Atualizar Packages | ✅ Sim | ❓ Incerto | ⭐⭐⭐⭐ Muito Alta |

## 🎯 Recomendação

1. **Primeiro:** Testar provider Anthropic (sem modificar código)
2. **Se não funcionar:** Forçar chat API no OpenAI provider
3. **Última opção:** Usar OpenAI Compatible provider

## 🧪 Como Testar

1. Limpar cache do build:
   ```bash
   rm -rf packages/backend/server/dist
   yarn workspace @affine/server build
   ```

2. Reiniciar servidor

3. Configurar Anthropic provider no admin

4. Testar chat IA

5. Verificar logs - deve usar `/v1/messages` ou `/v1/chat/completions`
