# Como Funciona a Seleção de Provider no AFFiNE

## 🎯 Resposta Rápida

**Sim**, o sistema de embeddings usa **OpenAI provider por padrão**, mas **não exclusivamente**. Ele usa o **primeiro provider que suportar embeddings**.

## 🔄 Ordem de Registro dos Providers

Os providers são registrados nesta ordem:

```typescript
// packages/backend/server/src/plugins/copilot/providers/index.ts
export const CopilotProviders = [
  OpenAIProvider,           // 1º - Suporta embeddings ✅
  FalProvider,              // 2º - Não suporta embeddings ❌
  GeminiGenerativeProvider, // 3º - Suporta embeddings ✅
  GeminiVertexProvider,     // 4º - Suporta embeddings ✅
  PerplexityProvider,       // 5º - Não suporta embeddings ❌
  AnthropicOfficialProvider,// 6º - Não suporta embeddings ❌
  AnthropicVertexProvider,  // 7º - Não suporta embeddings ❌
  MorphProvider,            // 8º - Não suporta embeddings ❌
];
```

## 🔍 Lógica de Seleção

### Passo 1: Busca por Provider

```typescript
// packages/backend/server/src/plugins/copilot/providers/factory.ts
async getProvider(cond: ModelFullConditions): Promise<CopilotProvider | null> {
  this.logger.debug(`Resolving copilot provider for output type: ${cond.outputType}`);
  
  let candidate: CopilotProvider | null = null;
  
  // Itera sobre os providers NA ORDEM DE REGISTRO
  for (const [type, provider] of this.#providers.entries()) {
    const isMatched = await provider.match(cond);
    
    if (isMatched) {
      candidate = provider;
      this.logger.debug(`Copilot provider candidate found: ${type}`);
      break; // ⚠️ PARA NO PRIMEIRO QUE ENCONTRAR
    }
  }
  
  return candidate;
}
```

### Passo 2: Verificação de Compatibilidade

Cada provider verifica se suporta o `outputType` solicitado:

```typescript
// packages/backend/server/src/plugins/copilot/providers/provider.ts
async match(cond: ModelFullConditions = {}): Promise<boolean> {
  return this.configured() && !!this.findValidModel(cond);
}

private findValidModel(cond: ModelFullConditions): CopilotProviderModel | undefined {
  const { modelId, outputType, inputTypes } = cond;
  
  // Verifica se o provider tem um modelo que suporta o outputType
  const matcher = (cap: ModelCapability) =>
    (!outputType || cap.output.includes(outputType)) &&
    (!inputTypes?.length || inputTypes.every(type => cap.input.includes(type)));
  
  return this.models.find(m => m.capabilities.some(matcher));
}
```

## 📊 Fluxo Completo para Embeddings

```
1. Sistema precisa gerar embeddings
   ↓
2. Chama: getProvider({ outputType: ModelOutputType.Embedding })
   ↓
3. Factory itera sobre providers na ordem:
   
   a) OpenAIProvider
      - configured() ? ✅ Sim (se configurado no Admin Panel)
      - Suporta Embedding? ✅ Sim
      - SELECIONADO! ✅
   
   b) FalProvider
      - (não chega aqui se OpenAI foi selecionado)
   
   c) GeminiGenerativeProvider
      - (não chega aqui se OpenAI foi selecionado)
   
   ... e assim por diante
   ↓
4. Retorna: OpenAIProvider (se configurado)
   OU
   Retorna: GeminiGenerativeProvider (se OpenAI não configurado)
   OU
   Retorna: null (se nenhum configurado)
```

## 🎯 Cenários Práticos

### Cenário 1: Apenas Anthropic Configurado

```
Providers configurados:
- ❌ OpenAI: Não configurado
- ❌ Gemini: Não configurado
- ✅ Anthropic: Configurado

Resultado para Embeddings:
❌ ERRO: "Copilot provider embedding does not support output type embedding"

Por quê?
- OpenAI não está configurado (pula)
- Gemini não está configurado (pula)
- Anthropic não suporta embeddings (pula)
- Nenhum provider encontrado!
```

### Cenário 2: OpenAI + Anthropic Configurados

```
Providers configurados:
- ✅ OpenAI: Configurado
- ✅ Anthropic: Configurado

Resultado para Embeddings:
✅ USA: OpenAI

Por quê?
- OpenAI é o primeiro na lista
- OpenAI está configurado
- OpenAI suporta embeddings
- SELECIONADO!
```

### Cenário 3: Gemini + Anthropic Configurados

```
Providers configurados:
- ❌ OpenAI: Não configurado
- ✅ Gemini: Configurado
- ✅ Anthropic: Configurado

Resultado para Embeddings:
✅ USA: Gemini

Por quê?
- OpenAI não está configurado (pula)
- Gemini é o próximo na lista
- Gemini está configurado
- Gemini suporta embeddings
- SELECIONADO!
```

### Cenário 4: Todos Configurados

```
Providers configurados:
- ✅ OpenAI: Configurado
- ✅ Gemini: Configurado
- ✅ Anthropic: Configurado

Resultado para Embeddings:
✅ USA: OpenAI (sempre o primeiro)

Resultado para Chat:
✅ USA: OpenAI (primeiro que suporta chat)
```

## 🔧 Como Forçar um Provider Específico

### Opção 1: Configurar Apenas o Desejado

Se você quer usar **apenas Gemini** para embeddings:

1. **Não configure** OpenAI no Admin Panel
2. **Configure** Gemini no Admin Panel
3. Sistema usará Gemini automaticamente

### Opção 2: Custom Model Override

No Admin Panel → Custom Models:

```json
{
  "override_enabled": true,
  "scenarios": {
    "embedding": "gemini-embedding-001"
  }
}
```

Isso força o uso de um modelo específico, mas o provider ainda precisa estar configurado.

### Opção 3: Desabilitar Provider (Código)

Não recomendado, mas possível:

```typescript
// Remover provider da lista
export const CopilotProviders = [
  // OpenAIProvider, // ❌ Comentado
  FalProvider,
  GeminiGenerativeProvider,
  // ...
];
```

## 📝 Modelo Padrão para Embeddings

```typescript
// packages/backend/server/src/plugins/copilot/embedding/client.ts
const EMBEDDING_MODEL = 'gemini-embedding-001';
```

**Importante**: Este é o **modelo padrão**, não o **provider padrão**.

O sistema funciona assim:

1. **Modelo padrão**: `gemini-embedding-001`
2. **Busca provider**: Que tenha esse modelo
3. **Se não encontrar**: Usa o primeiro provider que suporta embeddings
4. **Se custom model configurado**: Usa o modelo customizado

## 🎯 Recomendação para Self-Hosted

### Configuração Ideal (Dual Provider)

```
Admin Panel:
- ✅ OpenAI Provider: Configurado (para embeddings)
- ✅ Anthropic Provider: Configurado (para chat)

Custom Models:
- chat: "claude-4-5-haiku"
- embedding: "titan-embed-text"

Resultado:
- Chat: Usa Anthropic (Claude)
- Embeddings: Usa OpenAI (Titan via LiteLLM)
```

### Por Que Essa Configuração?

1. **OpenAI é o primeiro** na lista de providers
2. **OpenAI suporta embeddings** (Anthropic não)
3. **Anthropic é melhor para chat** (via LiteLLM)
4. **Ambos apontam para LiteLLM** (mesma infraestrutura)
5. **Sem conflitos** (cada um para sua especialidade)

## 🔍 Como Verificar Qual Provider Está Sendo Usado

### Logs do Servidor

```bash
# Iniciar servidor com logs detalhados
yarn workspace @affine/server start

# Procurar por:
[CopilotProviderFactory] Resolving copilot provider for output type: embedding
[CopilotProviderFactory] Copilot provider candidate found: openai
[OpenAIProvider] Using provider openai for embedding
```

### Via GraphQL

```graphql
query {
  serverConfig {
    copilot {
      providers {
        openai {
          configured
        }
        anthropic {
          configured
        }
        gemini {
          configured
        }
      }
    }
  }
}
```

## 📊 Tabela de Suporte a Embeddings

| Provider | Suporta Embeddings | Modelos | Ordem |
|----------|-------------------|---------|-------|
| OpenAI | ✅ Sim | text-embedding-* | 1º |
| Fal | ❌ Não | - | 2º |
| Gemini Generative | ✅ Sim | gemini-embedding-001 | 3º |
| Gemini Vertex | ✅ Sim | text-embedding-004 | 4º |
| Perplexity | ❌ Não | - | 5º |
| Anthropic Official | ❌ Não | - | 6º |
| Anthropic Vertex | ❌ Não | - | 7º |
| Morph | ❌ Não | - | 8º |

## 💡 Conclusão

**Resposta à sua pergunta**:

> "O sistema de indexação e embedding usa por padrão o openai provider?"

**Sim**, mas com nuances:

1. ✅ **OpenAI é o primeiro** na lista de providers
2. ✅ **OpenAI suporta embeddings** (diferente do Anthropic)
3. ⚠️ **Mas só se estiver configurado** no Admin Panel
4. ⚠️ **Se não estiver configurado**, usa o próximo (Gemini)
5. ⚠️ **Se nenhum estiver configurado**, dá erro

**Recomendação**:
- Configure **OpenAI provider** no Admin Panel
- Aponte para **LiteLLM** (http://localhost:4000/v1)
- Use modelo **titan-embed-text** (AWS Bedrock)
- Mantenha **Anthropic** para chat

Assim você tem o melhor dos dois mundos! 🚀

## 📚 Referências

- **Factory**: `packages/backend/server/src/plugins/copilot/providers/factory.ts`
- **Providers List**: `packages/backend/server/src/plugins/copilot/providers/index.ts`
- **Embedding Client**: `packages/backend/server/src/plugins/copilot/embedding/client.ts`
- **Provider Base**: `packages/backend/server/src/plugins/copilot/providers/provider.ts`
