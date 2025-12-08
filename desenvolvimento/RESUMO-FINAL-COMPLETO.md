# Resumo Final: AFFiNE Self-Hosted com AWS Bedrock (Chat + Embeddings)

## 🎯 Objetivo Alcançado

Configurar AFFiNE self-hosted com IA completa usando AWS Bedrock:
- ✅ Chat com Claude 4.5 Sonnet/Haiku
- ✅ Embeddings com Titan Embed Text v2
- ✅ Busca semântica nos documentos
- ✅ Busca por palavras-chave
- ✅ Tudo via LiteLLM proxy

## 🏗️ Arquitetura Final

```
┌─────────────────────────────────────────────────────────────┐
│                      AFFiNE Frontend                        │
│                    (localhost:8080)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    AFFiNE Backend Server                    │
│                     (localhost:3010)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Anthropic Provider (Único Provider)          │  │
│  │                                                       │  │
│  │  • Chat: claude-4-5-sonnet, claude-4-5-haiku        │  │
│  │  • Embeddings: text-embedding-ada-002                │  │
│  │  • BaseURL: http://localhost:4000/v1                 │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    LiteLLM Proxy Server                     │
│                    (localhost:4000)                         │
│                                                             │
│  Model Mappings:                                            │
│  • claude-4-5-sonnet → bedrock/claude-sonnet-4-5           │
│  • claude-4-5-haiku → bedrock/claude-haiku-4-5             │
│  • text-embedding-ada-002 → bedrock/titan-embed-text-v2    │
│  • gemini-embedding-001 → bedrock/titan-embed-text-v2      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      AWS Bedrock                            │
│                                                             │
│  • Claude 4.5 Sonnet (Chat)                                │
│  • Claude 4.5 Haiku (Chat)                                 │
│  • Titan Embed Text v2 (Embeddings - 1024 dims)           │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Componentes

### 1. Docker Services (`.docker/dev/compose.yml`)
- **PostgreSQL** (com pgvector): Banco de dados + embeddings
- **Redis**: Cache e sessões
- **LiteLLM**: Proxy para AWS Bedrock
- **Manticore Search**: Busca por palavras-chave
- **Mailpit**: Email local (dev)

### 2. AFFiNE Backend
- **Anthropic Provider**: Chat + Embeddings via LiteLLM
- **Indexer**: Indexação de documentos (Manticore)
- **Embedding Client**: Geração e busca de embeddings
- **Features**: unlimited_copilot, administrator, free_plan_v1

### 3. LiteLLM Configuration
- **Chat Models**: Claude 4.5 Sonnet, Haiku, 3.5 Sonnet, etc.
- **Embedding Models**: text-embedding-ada-002, gemini-embedding-001
- **AWS Integration**: Credenciais via environment variables

## 🔧 Configuração

### Environment Variables

**`.docker/dev/.env`** (LiteLLM):
```bash
AWS_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
LITELLM_MASTER_KEY=sk-affine-dev-key
DATABASE_URL=postgresql://litellm:litellm@postgres:5432/litellm
```

**`packages/backend/server/.env`** (AFFiNE):
```bash
# Anthropic Provider (aponta para LiteLLM)
COPILOT_ANTHROPIC_API_KEY=sk-affine-dev-key
COPILOT_ANTHROPIC_BASE_URL=http://localhost:4000/v1

# Indexer (Manticore Search)
AFFINE_INDEXER_ENABLED=true
AFFINE_INDEXER_SEARCH_ENDPOINT=http://localhost:9308
```

### Admin Panel Configuration

**URL**: `http://localhost:8080/admin`

**Anthropic Provider**:
```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

**Custom Models** (opcional):
```json
{
  "chat": "claude-4-5-haiku",
  "embedding": "text-embedding-ada-002"
}
```

## 🚀 Como Iniciar

### 1. Iniciar Docker Services
```bash
cd .docker/dev
docker compose up -d
```

### 2. Iniciar AFFiNE Server
```bash
cd packages/backend/server
yarn run dev
```

### 3. Acessar Admin Panel
```
http://localhost:8080/admin/setup
```

Criar conta admin: `dev@affine.pro`

### 4. Configurar Features no Banco
```sql
-- Associar features ao usuário admin
INSERT INTO "user_features" ("userId", "featureId", reason, "createdAt")
SELECT 
  u.id,
  f.id,
  0,
  NOW()
FROM users u
CROSS JOIN features f
WHERE u.email = 'dev@affine.pro'
  AND f.feature IN ('administrator', 'unlimited_copilot')
ON CONFLICT DO NOTHING;

-- Associar unlimited_copilot aos workspaces
INSERT INTO "workspace_features" ("workspaceId", "featureId", reason, "createdAt")
SELECT 
  w.id,
  f.id,
  0,
  NOW()
FROM workspaces w
CROSS JOIN features f
WHERE f.feature = 'unlimited_copilot'
ON CONFLICT DO NOTHING;
```

### 5. Habilitar Embeddings no Workspace
- Abrir workspace settings
- Ativar "Enable semantic search"
- Aguardar indexação

## ✅ Funcionalidades Disponíveis

### Chat
- ✅ Conversar com Claude via chat
- ✅ Suporte a imagens (vision)
- ✅ Function calling (tools)
- ✅ Streaming de respostas
- ✅ Reasoning (modelos 4.x)

### Embeddings
- ✅ Indexação automática de documentos
- ✅ Busca semântica (docSemanticSearch)
- ✅ Busca por palavras-chave (docKeywordSearch)
- ✅ Atualização incremental
- ✅ Cleanup automático

### Tools Disponíveis no Chat
- `docRead`: Ler conteúdo de documentos
- `docSemanticSearch`: Buscar por similaridade semântica
- `docKeywordSearch`: Buscar por palavras-chave
- `docEdit`: Editar documentos
- `blobRead`: Ler arquivos anexados
- `webSearch`: Buscar na web (se configurado)

## 📊 Custos Estimados (AWS Bedrock)

### Chat (Claude 4.5 Haiku)
- Input: $0.80 / 1M tokens
- Output: $4.00 / 1M tokens
- **Exemplo**: 100 conversas/dia ≈ $5-10/mês

### Embeddings (Titan Embed Text v2)
- $0.0001 / 1K tokens
- **Exemplo**: 1000 documentos ≈ $0.10-0.50/mês

**Total estimado**: $5-15/mês (uso moderado)

## 🔍 Verificação e Testes

### Verificar Providers Registrados
```bash
# Logs do servidor devem mostrar:
[CopilotProviderFactory] Copilot provider [anthropic] registered.
[ProductionEmbeddingClient] Copilot embedding client configured successfully with model: text-embedding-ada-002
```

### Testar Chat
```
Você: "Olá, como você está?"
Claude: "Olá! Estou bem, obrigado por perguntar..."
```

### Testar Embeddings
```sql
-- Ver embeddings gerados
SELECT 
  "workspaceId",
  "docId",
  array_length(embedding, 1) as dimensions,
  "createdAt"
FROM "doc_embeddings"
ORDER BY "createdAt" DESC
LIMIT 5;
```

### Testar Busca Semântica
```
Você: "Quais documentos falam sobre [seu tópico]?"
Claude: [Usa docSemanticSearch e retorna documentos relevantes]
```

## 🐛 Troubleshooting

### Chat não funciona
1. Verificar se Anthropic provider está configurado no Admin Panel
2. Verificar logs do LiteLLM: `docker logs affine_dev_services-litellm-1`
3. Verificar credenciais AWS no `.docker/dev/.env`

### Embeddings não são gerados
1. Verificar se workspace tem feature `unlimited_copilot`
2. Verificar se indexer está habilitado
3. Verificar logs: `[CopilotEmbeddingJob] Trigger embedding for X docs`

### Erro "Invalid model name"
1. Verificar se modelo está em `litellm_config.yaml`
2. Reiniciar LiteLLM: `docker compose restart litellm`

## 📝 Arquivos Importantes

### Configuração
- `.docker/dev/compose.yml` - Docker services
- `.docker/dev/.env` - Environment variables (LiteLLM)
- `.docker/dev/litellm_config.yaml` - LiteLLM models
- `packages/backend/server/.env` - AFFiNE environment

### Código Modificado
- `packages/backend/server/src/plugins/copilot/providers/anthropic/anthropic.ts` - Suporte a embeddings
- `packages/backend/server/src/plugins/copilot/providers/anthropic/official.ts` - Modelo text-embedding-ada-002
- `packages/backend/server/src/plugins/copilot/providers/openai.ts` - Modelo gemini-embedding-001 (fallback)
- `packages/backend/server/src/plugins/copilot/embedding/client.ts` - Logs de debug

### Documentação
- `desenvolvimento/SOLUCAO-EMBEDDINGS-ANTHROPIC-LITELLM.md` - Solução detalhada
- `desenvolvimento/GUIA-RAPIDO-EMBEDDINGS.md` - Guia rápido
- `desenvolvimento/AWS-BEDROCK-CLAUDE-GUIDE.md` - Setup AWS Bedrock
- `desenvolvimento/LITELLM-SETUP-GUIDE.md` - Setup LiteLLM

## 🎓 Lições Aprendidas

1. **Provider Unificado**: Melhor usar 1 provider (Anthropic) para tudo do que múltiplos
2. **LiteLLM é Poderoso**: Faz proxy perfeito entre diferentes APIs
3. **Model Aliasing**: Usar nomes OpenAI-compatíveis facilita integração
4. **HTTP Direct**: Quando SDK não suporta, chamadas HTTP diretas funcionam
5. **Embeddings = 1024 dims**: AFFiNE requer exatamente 1024 dimensões

## 🚀 Próximos Passos

- [ ] Adicionar mais modelos Claude (Opus 4, etc.)
- [ ] Implementar cache de embeddings
- [ ] Adicionar métricas de uso
- [ ] Testar com volumes maiores
- [ ] Otimizar batch size
- [ ] Adicionar suporte a embeddings multimodais

## 🎉 Status Final

**✅ TUDO FUNCIONANDO PERFEITAMENTE!**

- ✅ Chat com Claude via AWS Bedrock
- ✅ Embeddings com Titan via AWS Bedrock
- ✅ Busca semântica operacional
- ✅ Busca por palavras-chave operacional
- ✅ Indexação automática funcionando
- ✅ Um único provider para tudo
- ✅ Arquitetura limpa e escalável

**Data**: 04/12/2025  
**Versão**: AFFiNE Canary (latest)  
**Testado**: ✅ Produção local  
**Documentado**: ✅ Completo
