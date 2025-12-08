# Diagnóstico: Embedding Client Not Configured

## 🔍 Problema

Mesmo com OpenAI provider configurado, o erro persiste:
```
no_copilot_provider_available: embedding client not configured
```

## ✅ Verificações Já Feitas

1. ✅ OpenAI Provider configurado no Admin Panel
2. ✅ Custom Models configurado (`embedding: titan-embed-text`)
3. ✅ LiteLLM respondendo corretamente
4. ✅ Modelo `titan-embed-text` disponível no LiteLLM

## 🚨 Possíveis Causas

### Causa 1: Cache do Embedding Client

O embedding client é inicializado **uma vez** e armazenado em cache:

```typescript
// packages/backend/server/src/plugins/copilot/embedding/client.ts
let EMBEDDING_CLIENT: EmbeddingClient | undefined;

export async function getEmbeddingClient(moduleRef: ModuleRef): Promise<EmbeddingClient | undefined> {
  if (EMBEDDING_CLIENT) {
    return EMBEDDING_CLIENT; // ⚠️ Retorna cache
  }
  // ...
}
```

**Problema**: Se o client foi inicializado **antes** de você configurar o OpenAI provider, ele ficou como `undefined` no cache.

**Solução**: Reiniciar servidor **completamente**.

### Causa 2: Provider Não Registrado

O provider OpenAI pode não ter sido registrado corretamente.

**Verificação**: Procurar nos logs por:
```
[CopilotProviderFactory] Copilot provider [openai] registered
```

### Causa 3: Configuração Não Carregada

A configuração do Admin Panel pode não ter sido carregada corretamente.

**Verificação**: Procurar nos logs por:
```
[Config] Configuration loaded
[Config] Copilot providers configured
```

## 🔧 Soluções

### Solução 1: Reiniciar Servidor Completamente (RECOMENDADO)

```bash
# 1. Parar servidor (Ctrl+C)

# 2. Limpar cache do Node.js
$env:NODE_OPTIONS="--max-old-space-size=4096"

# 3. Iniciar servidor novamente
yarn workspace @affine/server start
```

### Solução 2: Rebuild do Servidor

Se o problema persistir:

```bash
# 1. Parar servidor

# 2. Rebuild
yarn workspace @affine/server build

# 3. Iniciar
yarn workspace @affine/server start
```

### Solução 3: Verificar Configuração no Banco de Dados

A configuração do Admin Panel é salva no banco de dados. Vamos verificar:

```sql
-- Conectar ao PostgreSQL
psql -h localhost -U affine -d affine

-- Ver configuração do Copilot
SELECT * FROM server_runtime_configs WHERE key = 'copilot';

-- Deve mostrar algo como:
-- key: copilot
-- value: {"providers":{"openai":{"apiKey":"sk-affine-dev-key","baseURL":"http://localhost:4000/v1"},...}}
```

Se não mostrar a configuração do OpenAI, significa que não foi salva corretamente.

### Solução 4: Forçar Reconfiguração

1. Acesse Admin Panel
2. Vá em AI
3. **Remova** a configuração do OpenAI
4. **Salve**
5. **Adicione novamente** a configuração do OpenAI
6. **Salve**
7. Reinicie o servidor

### Solução 5: Verificar Ordem de Inicialização

O problema pode ser a ordem de inicialização dos módulos. Vamos verificar:

```typescript
// packages/backend/server/src/plugins/copilot/index.ts
@Module({
  imports: [
    DocStorageModule,
    FeatureModule,
    QuotaModule,
    PermissionModule,
    ServerConfigModule, // ⚠️ Config deve ser carregado antes
    WorkspaceModule,
    IndexerModule,
  ],
  providers: [
    ...CopilotProviders, // ⚠️ Providers devem ser registrados
    CopilotProviderFactory,
    // ...
  ],
})
```

## 🧪 Testes de Diagnóstico

### Teste 1: Verificar se Provider Está Registrado

Adicione log temporário no código:

```typescript
// packages/backend/server/src/plugins/copilot/providers/factory.ts
async getProvider(cond: ModelFullConditions): Promise<CopilotProvider | null> {
  console.log('🔍 Providers registrados:', Array.from(this.#providers.keys()));
  console.log('🔍 Buscando provider para:', cond);
  // ...
}
```

**Resultado esperado**:
```
🔍 Providers registrados: ['openai', 'fal', 'gemini-generative', 'anthropic-official']
🔍 Buscando provider para: { modelId: 'titan-embed-text', outputType: 'embedding' }
```

### Teste 2: Verificar Configuração do Provider

```typescript
// packages/backend/server/src/plugins/copilot/providers/openai.ts
override configured(): boolean {
  const result = Boolean(this.config.apiKey);
  console.log('🔍 OpenAI configured:', result, 'apiKey:', this.config.apiKey?.substring(0, 10));
  return result;
}
```

**Resultado esperado**:
```
🔍 OpenAI configured: true apiKey: sk-affine-
```

### Teste 3: Verificar Embedding Client

```typescript
// packages/backend/server/src/plugins/copilot/embedding/client.ts
override async configured(): Promise<boolean> {
  console.log('🔍 Verificando embedding client...');
  const modelId = this.config.copilot?.scenarios?.override_enabled
    ? this.config.copilot.scenarios.scenarios?.embedding || EMBEDDING_MODEL
    : EMBEDDING_MODEL;
  console.log('🔍 Modelo de embedding:', modelId);
  
  const embedding = await this.providerFactory.getProvider({
    modelId,
    outputType: ModelOutputType.Embedding,
  });
  
  console.log('🔍 Provider encontrado:', embedding?.type);
  const result = Boolean(embedding);
  if (!result) {
    this.logger.warn('Copilot embedding client is not configured properly');
  }
  return result;
}
```

**Resultado esperado**:
```
🔍 Verificando embedding client...
🔍 Modelo de embedding: titan-embed-text
🔍 Provider encontrado: openai
```

## 📊 Checklist de Diagnóstico

Execute na ordem:

- [ ] **Passo 1**: Verificar se LiteLLM está respondendo
  ```bash
  curl http://localhost:4000/health
  ```

- [ ] **Passo 2**: Verificar modelos disponíveis no LiteLLM
  ```bash
  curl http://localhost:4000/v1/models -H "Authorization: Bearer sk-affine-dev-key"
  ```

- [ ] **Passo 3**: Verificar configuração no banco de dados
  ```sql
  SELECT * FROM server_runtime_configs WHERE key = 'copilot';
  ```

- [ ] **Passo 4**: Reiniciar servidor completamente
  ```bash
  # Ctrl+C
  yarn workspace @affine/server start
  ```

- [ ] **Passo 5**: Verificar logs de inicialização
  ```
  Procurar por:
  - [CopilotProviderFactory] Copilot provider [openai] registered
  - [Config] Configuration loaded
  ```

- [ ] **Passo 6**: Testar embedding manualmente
  ```bash
  curl -X POST http://localhost:4000/v1/embeddings \
    -H "Authorization: Bearer sk-affine-dev-key" \
    -H "Content-Type: application/json" \
    -d '{"model":"titan-embed-text","input":"test"}'
  ```

## 🎯 Solução Mais Provável

Baseado nos sintomas, a causa mais provável é **cache do embedding client**.

**Solução**:
1. Parar servidor (Ctrl+C)
2. Aguardar 5 segundos
3. Iniciar servidor novamente
4. Aguardar inicialização completa (até ver "Application is running")
5. Testar novamente

## 📝 Logs Importantes

Ao iniciar o servidor, procure por estas mensagens **na ordem**:

```
1. [Config] Configuration loaded
2. [CopilotProviderFactory] Copilot provider [openai] registered
3. [CopilotProviderFactory] Copilot provider [anthropic-official] registered
4. [ProductionEmbeddingClient] Embedding client configured
5. [IndexerService] Indexer enabled, endpoint: http://localhost:9308
```

Se alguma dessas mensagens **não aparecer**, há um problema na inicialização.

## 🚨 Se Nada Funcionar

Se após todas as tentativas o erro persistir, há um bug no código. Nesse caso:

### Workaround Temporário: Usar Gemini para Embeddings

1. Configure Gemini provider no Admin Panel:
   ```json
   {
     "apiKey": "YOUR_GEMINI_API_KEY"
   }
   ```

2. Altere custom model para:
   ```json
   {
     "embedding": "gemini-embedding-001"
   }
   ```

3. Reinicie servidor

Isso deve funcionar porque Gemini é o modelo padrão de embeddings no código.

## 📞 Próximos Passos

1. Execute o **Checklist de Diagnóstico** acima
2. Anote quais passos **falharam**
3. Compartilhe os logs de inicialização do servidor
4. Vamos identificar exatamente onde está o problema

## 💡 Dica Final

O erro `embedding client not configured` significa que o método `configured()` do `ProductionEmbeddingClient` está retornando `false`. Isso só acontece se:

1. ❌ Nenhum provider está configurado
2. ❌ Nenhum provider suporta embeddings
3. ❌ O modelo especificado não existe em nenhum provider

Como você já configurou o OpenAI e o modelo existe no LiteLLM, o problema é **cache** ou **ordem de inicialização**.

**Solução definitiva**: Reiniciar servidor completamente e aguardar inicialização completa.
