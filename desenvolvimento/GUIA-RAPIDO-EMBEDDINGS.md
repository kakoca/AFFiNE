# Guia Rápido: Habilitar Embeddings no AFFiNE Self-Hosted

## ⚡ Setup Rápido (5 minutos)

### 1. Configurar LiteLLM

Já está configurado em `.docker/dev/litellm_config.yaml` com:
- ✅ `text-embedding-ada-002` → AWS Bedrock Titan
- ✅ `gemini-embedding-001` → AWS Bedrock Titan

### 2. Configurar Anthropic Provider no Admin Panel

```
URL: http://localhost:8080/admin
```

**AI Settings → Anthropic Provider:**
```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

**Salvar** ✅

### 3. Habilitar Indexer

Já está configurado em `packages/backend/server/.env`:
```bash
AFFINE_INDEXER_ENABLED=true
AFFINE_INDEXER_SEARCH_ENDPOINT=http://localhost:9308
```

### 4. Verificar Features no Banco

```sql
-- Verificar se workspace tem unlimited_copilot
SELECT 
  w.id as workspace_id,
  f.feature,
  f.type
FROM workspaces w
LEFT JOIN "workspace_features" wf ON w.id = wf."workspaceId"
LEFT JOIN features f ON wf."featureId" = f.id
WHERE w.id = 'SEU_WORKSPACE_ID';

-- Se não tiver, adicionar:
INSERT INTO "workspace_features" ("workspaceId", "featureId", reason, "createdAt")
SELECT 
  'SEU_WORKSPACE_ID',
  f.id,
  0,
  NOW()
FROM features f
WHERE f.feature = 'unlimited_copilot';
```

### 5. Habilitar Embeddings no Workspace

**No Frontend:**
1. Abrir workspace
2. Settings → AI/Copilot
3. Ativar "Enable semantic search"
4. Aguardar indexação

**Ou via GraphQL:**
```graphql
mutation {
  updateWorkspace(
    input: {
      id: "SEU_WORKSPACE_ID"
      enableEmbedding: true
    }
  ) {
    id
  }
}
```

## ✅ Verificar se Funcionou

### Logs do Servidor

```
[ProductionEmbeddingClient] Copilot embedding client configured successfully with model: text-embedding-ada-002
[CopilotProviderFactory] Copilot provider candidate found: anthropic
[CopilotEmbeddingJob] Trigger embedding for 3 docs in workspace
```

### Banco de Dados

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

Deve retornar embeddings com **1024 dimensões**.

### LiteLLM Logs

```
INFO: 172.21.0.1:58110 - "POST /v1/embeddings HTTP/1.1" 200 OK
```

## 🎯 Testar Busca Semântica

1. Criar alguns documentos com conteúdo
2. Aguardar indexação (alguns segundos)
3. Usar o chat do AFFiNE
4. Perguntar algo relacionado aos documentos
5. O sistema vai usar `docSemanticSearch` automaticamente

**Exemplo:**
```
Você: "Quais documentos falam sobre bolo de chocolate?"
AI: [Busca semanticamente e retorna documentos relevantes]
```

## 🔧 Troubleshooting Rápido

### Erro: "Copilot embedding client is not configured properly"
```bash
# Verificar se Anthropic provider está configurado
curl http://localhost:3010/api/copilot/config
```

### Erro: "Invalid model name"
```bash
# Verificar modelos disponíveis no LiteLLM
curl http://localhost:4000/v1/models \
  -H "Authorization: Bearer sk-affine-dev-key"
```

### Embeddings não são gerados
```bash
# Verificar logs do servidor
yarn run dev

# Verificar logs do LiteLLM
docker logs affine_dev_services-litellm-1 --tail 50
```

## 📊 Comandos Úteis

```bash
# Reiniciar LiteLLM
docker compose -f .docker/dev/compose.yml restart litellm

# Reiniciar servidor AFFiNE
# Ctrl+C no terminal do yarn run dev
yarn run dev

# Ver embeddings no banco
docker exec -i affine_dev_services-postgres-1 psql -U affine -d affine -c "
SELECT COUNT(*) as total_embeddings FROM doc_embeddings;
"

# Limpar embeddings (se necessário)
docker exec -i affine_dev_services-postgres-1 psql -U affine -d affine -c "
TRUNCATE TABLE doc_embeddings CASCADE;
"
```

## 🎉 Pronto!

Agora você tem:
- ✅ Chat com Claude via AWS Bedrock
- ✅ Embeddings com Titan via AWS Bedrock
- ✅ Busca semântica nos documentos
- ✅ Busca por palavras-chave (Manticore)
- ✅ Tudo via LiteLLM proxy
- ✅ Um único provider (Anthropic) para tudo

**Custo estimado**: ~$0.0001 por 1K tokens de embedding (muito barato!)
