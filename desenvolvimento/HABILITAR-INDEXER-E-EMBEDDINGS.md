# Habilitar Indexer e Embeddings - Guia Completo

## 🎯 Visão Geral

Para ter **busca completa** no Copilot, você precisa de **3 componentes**:

1. ✅ **Manticore Search** (Indexer) - Busca por palavras-chave
2. ✅ **pgvector** (PostgreSQL) - Busca semântica (embeddings)
3. ❌ **Configuração correta** - Habilitar no servidor

## 📊 Status Atual

### Docker Services (✅ OK)

```yaml
✅ postgres (pgvector/pgvector:pg16) - Suporta embeddings
✅ manticoresearch (10.1.0) - Indexer para busca por palavras-chave
✅ redis - Cache
✅ litellm - Proxy AI
```

### Configuração do Servidor (❌ FALTA)

```bash
❌ AFFINE_INDEXER_ENABLED=true  # Comentado
❌ OpenAI Provider              # Não configurado (necessário para embeddings)
```

## 🔧 Correção Completa

### Passo 1: Habilitar Indexer no Servidor

**Arquivo**: `packages/backend/server/.env`

**Adicionar/Descomentar**:
```bash
# Indexação
AFFINE_INDEXER_ENABLED=true
AFFINE_INDEXER_SEARCH_ENDPOINT=http://localhost:9308
```

**Arquivo completo atualizado**:
```bash
DATABASE_URL="postgresql://affine:affine@localhost:5432/affine"
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379

# Mailpit (servidor SMTP de desenvolvimento)
MAILER_HOST=127.0.0.1
MAILER_PORT=1025
MAILER_SENDER="noreply@toeverything.info"
MAILER_USER="noreply@toeverything.info"
MAILER_PASSWORD="affine"
MAILER_SECURE=false

# Ambiente
NODE_ENV=production
AFFINE_ENV=dev
DEPLOYMENT_TYPE=selfhosted

# ============================================
# Copilot AI via LiteLLM Proxy
# ============================================
COPILOT_OPENAI_BASE_URL=http://localhost:4000
COPILOT_OPENAI_API_KEY=sk-affine-dev-key

# ============================================
# Indexer (Manticore Search)
# ============================================
AFFINE_INDEXER_ENABLED=true
AFFINE_INDEXER_SEARCH_ENDPOINT=http://localhost:9308
```

### Passo 2: Configurar Dual Provider no Admin Panel

Acesse: `http://localhost:3010/admin` → AI

#### 2.1 OpenAI Provider

```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

#### 2.2 Anthropic Provider

```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

#### 2.3 Custom Models

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

### Passo 3: Verificar Docker Services

```bash
# Verificar se todos os serviços estão rodando
docker ps

# Deve mostrar:
# - postgres (pgvector)
# - redis
# - manticoresearch
# - litellm
```

Se algum não estiver rodando:

```bash
cd .docker/dev
docker compose up -d
```

### Passo 4: Reiniciar Servidor AFFiNE

```bash
# Parar servidor (Ctrl+C no terminal)

# Iniciar novamente
yarn workspace @affine/server start
```

### Passo 5: Verificar Logs

Procure por estas mensagens no log do servidor:

```bash
✅ [IndexerService] Indexer enabled, endpoint: http://localhost:9308
✅ [CopilotProviderFactory] Registered provider: openai
✅ [CopilotProviderFactory] Registered provider: anthropic
```

### Passo 6: Habilitar Embeddings no Workspace

1. Acesse: `http://localhost:3010`
2. Vá em: Settings → Workspace Settings → Embedding
3. Ative o switch "Enable workspace embedding"
4. Aguarde sincronização

## 🧪 Testes de Verificação

### Teste 1: Indexer (Busca por Palavra-chave)

**Comando**:
```bash
# Verificar se Manticore está respondendo
curl http://localhost:9308
```

**Resposta esperada**:
```json
{"status":"ok"}
```

**No Copilot**:
```
Pergunta: "Busque documentos que contenham a palavra 'configuração'"
```

**Log esperado**:
```
[IndexerService] Searching for keyword: configuração
[docKeywordSearch] Found 3 documents
```

### Teste 2: Embeddings (Busca Semântica)

**No Copilot**:
```
Pergunta: "Encontre documentos sobre setup de IA"
```

**Log esperado**:
```
[CopilotProviderFactory] Resolving provider for output type: embedding
[OpenAIProvider] Using provider openai for embedding
[docSemanticSearch] Found 5 similar documents
```

### Teste 3: Leitura de Documento

**No Copilot**:
```
Pergunta: "Leia o documento sobre AWS Bedrock"
```

**Log esperado**:
```
[docRead] Reading document: [doc-id]
[DocReader] Retrieved markdown content
```

## 📊 Comparação de Ferramentas

| Ferramenta | Tipo de Busca | Requer | Status |
|------------|---------------|--------|--------|
| `docKeywordSearch` | Palavra-chave exata | Indexer (Manticore) | ✅ Disponível |
| `docSemanticSearch` | Similaridade semântica | Embeddings (pgvector) | ⚠️ Requer config |
| `docRead` | Leitura completa | Nenhum | ✅ Disponível |

## 🔄 Fluxo Completo

```
┌─────────────────────────────────────────────────────────────┐
│                    Copilot Request                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│ Keyword Search│          │ Semantic Search│
│               │          │                │
│ Manticore     │          │ pgvector       │
│ (Indexer)     │          │ (Embeddings)   │
│               │          │                │
│ Port: 9308    │          │ PostgreSQL     │
└───────────────┘          └────────────────┘
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
              ┌───────────────┐
              │   Results     │
              │   Combined    │
              └───────────────┘
```

## ⚠️ Troubleshooting

### Problema 1: Indexer não conecta

**Erro**:
```
Error: connect ECONNREFUSED 127.0.0.1:9308
```

**Solução**:
```bash
# Verificar se Manticore está rodando
docker ps | grep manticore

# Se não estiver, iniciar
cd .docker/dev
docker compose up -d manticoresearch
```

### Problema 2: Embeddings falham

**Erro**:
```
copilot_provider_not_supported: Copilot provider embedding does not support
```

**Solução**:
1. Configurar OpenAI provider no Admin Panel
2. Configurar custom model `embedding: titan-embed-text`
3. Reiniciar servidor

### Problema 3: Busca não retorna resultados

**Causa**: Documentos não foram indexados

**Solução**:
```bash
# Aguardar indexação automática (ocorre em background)
# Ou forçar reindexação criando/editando documentos
```

## 📝 Checklist Completo

### Docker Services
- [ ] PostgreSQL (pgvector) rodando
- [ ] Manticore Search rodando
- [ ] Redis rodando
- [ ] LiteLLM rodando

### Configuração do Servidor
- [ ] `AFFINE_INDEXER_ENABLED=true` no .env
- [ ] `AFFINE_INDEXER_SEARCH_ENDPOINT` configurado
- [ ] Servidor reiniciado

### Admin Panel
- [ ] OpenAI provider configurado
- [ ] Anthropic provider configurado
- [ ] Custom models configurados
- [ ] Configuração salva

### Workspace
- [ ] Embeddings habilitados
- [ ] Documentos criados
- [ ] Sincronização completa

### Testes
- [ ] Busca por palavra-chave funciona
- [ ] Busca semântica funciona
- [ ] Leitura de documentos funciona

## 🎯 Resultado Final

Após completar todos os passos:

✅ **Indexer**: Habilitado (Manticore Search)  
✅ **Embeddings**: Configurado (OpenAI → Titan)  
✅ **Chat**: Funcionando (Anthropic → Claude)  
✅ **Busca por Palavra-chave**: Operacional  
✅ **Busca Semântica**: Operacional  
✅ **Copilot Completo**: 100% Funcional  

## 📚 Documentação Relacionada

- **Fix Embeddings**: `desenvolvimento/FIX-EMBEDDING-PROVIDER.md`
- **Dual Provider**: `desenvolvimento/CONFIGURACAO-DUAL-PROVIDER.md`
- **Como Habilitar Embeddings**: `desenvolvimento/COMO-HABILITAR-EMBEDDINGS.md`
- **Capacidades do Copilot**: `desenvolvimento/COPILOT-WORKSPACE-ACCESS.md`

## 💡 Dicas Importantes

1. **Indexer vs Embeddings**:
   - Indexer: Busca rápida por palavras exatas
   - Embeddings: Busca inteligente por significado

2. **Performance**:
   - Indexer é mais rápido
   - Embeddings é mais preciso
   - Use ambos para melhor experiência

3. **Custos**:
   - Indexer: Sem custo (local)
   - Embeddings: Custo AWS (Titan Embed)

4. **Manutenção**:
   - Indexer: Automático
   - Embeddings: Requer sincronização periódica

## 🚀 Próximos Passos

1. ✅ Habilitar indexer no .env
2. ✅ Configurar dual provider no Admin Panel
3. ✅ Reiniciar servidor
4. ✅ Habilitar embeddings no workspace
5. ✅ Testar todas as funcionalidades
6. ✅ Monitorar logs para erros
7. ✅ Ajustar configurações conforme necessário
