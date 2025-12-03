# Guia: LiteLLM no Docker Compose do AFFiNE

## 🎯 O que foi configurado

Adicionamos o **LiteLLM** como um serviço no Docker Compose do AFFiNE. Ele funciona como um **gateway unificado** para múltiplos provedores de IA (AWS Bedrock, OpenAI, Azure, etc).

## 📁 Arquivos Modificados/Criados

1. `.docker/dev/compose.yml` - Adicionado serviço LiteLLM
2. `.docker/dev/.env` - Adicionadas variáveis AWS e LiteLLM
3. `.docker/dev/litellm_config.yaml` - Configuração dos modelos
4. `packages/backend/server/.env` - Configurado para usar LiteLLM + selfhosted

## 🚀 Como Usar

### 1. Configurar Credenciais AWS (se usar Bedrock)

Edite `.docker/dev/.env`:

```env
# Descomente e adicione suas credenciais
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION_NAME=us-east-1

# Chave master do LiteLLM (mude em produção!)
LITELLM_MASTER_KEY=sk-affine-dev-key
```

### 2. Iniciar os Serviços

```bash
cd .docker/dev
docker compose up -d
```

Isso vai iniciar:
- ✅ PostgreSQL
- ✅ Redis
- ✅ Mailpit
- ✅ Manticore Search
- ✅ **LiteLLM** (novo!)

### 3. Verificar se LiteLLM está rodando

```bash
# Ver logs
docker compose logs -f litellm

# Testar health check
curl http://localhost:4000/health

# Listar modelos disponíveis
curl http://localhost:4000/models \
  -H "Authorization: Bearer sk-affine-dev-key"
```

### 4. Iniciar o AFFiNE Server

```bash
# No diretório raiz do projeto
yarn workspace @affine/server dev
```

O servidor AFFiNE vai se conectar automaticamente ao LiteLLM em `http://localhost:4000`.

## 🔐 Controle de Acesso

### Opção 1: Chave Master Única (Atual)

Todos os usuários do AFFiNE compartilham a mesma chave (`sk-affine-dev-key`).

**Prós:** Simples
**Contras:** Sem controle granular

### Opção 2: Virtual Keys por Workspace (Recomendado)

Crie chaves específicas para cada workspace com limites de budget:

```bash
# Criar chave para workspace específico
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "models": ["claude-3-5-sonnet", "claude-3-haiku"],
    "max_budget": 100,
    "budget_duration": "30d",
    "metadata": {
      "workspace_id": "workspace-abc123",
      "workspace_name": "Equipe Marketing"
    }
  }'

# Resposta:
# {
#   "key": "sk-1234567890abcdef",
#   "expires": null,
#   "models": ["claude-3-5-sonnet", "claude-3-haiku"],
#   "max_budget": 100
# }
```

Depois, você precisaria modificar o código do AFFiNE para usar chaves diferentes por workspace.

### Opção 3: Teams no LiteLLM (Avançado)

LiteLLM suporta **Teams** com controle granular:

```bash
# Criar um team
curl -X POST http://localhost:4000/team/new \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "team_alias": "marketing-team",
    "models": ["claude-3-5-sonnet"],
    "max_budget": 500,
    "budget_duration": "30d"
  }'

# Criar chave para o team
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": "team-id-aqui",
    "models": ["claude-3-5-sonnet"]
  }'
```

## 📊 Monitoramento e Custos

### Ver Uso por Modelo

```bash
curl http://localhost:4000/spend/logs \
  -H "Authorization: Bearer sk-affine-dev-key"
```

### Ver Uso por Chave

```bash
curl http://localhost:4000/key/info?key=sk-1234567890abcdef \
  -H "Authorization: Bearer sk-affine-dev-key"
```

### Dashboard Web (Opcional)

LiteLLM tem uma UI web para gerenciamento:

```bash
# Adicionar ao docker-compose.yml
litellm-ui:
  image: ghcr.io/berriai/litellm-ui:main-latest
  ports:
    - 4001:4001
  environment:
    LITELLM_PROXY_URL: http://litellm:4000
```

Acesse: http://localhost:4001

## 🔧 Configuração Avançada

### Adicionar Outros Provedores

Edite `.docker/dev/litellm_config.yaml`:

```yaml
model_list:
  # Azure OpenAI
  - model_name: gpt-4-azure
    litellm_params:
      model: azure/gpt-4
      api_base: https://your-endpoint.openai.azure.com
      api_key: os.environ/AZURE_API_KEY
      api_version: "2024-02-15-preview"

  # Google Vertex AI
  - model_name: gemini-pro
    litellm_params:
      model: vertex_ai/gemini-pro
      vertex_project: your-project-id
      vertex_location: us-central1

  # Ollama (local)
  - model_name: llama3-local
    litellm_params:
      model: ollama/llama3
      api_base: http://host.docker.internal:11434
```

### Habilitar Cache (Redis)

Edite `.docker/dev/litellm_config.yaml`:

```yaml
litellm_settings:
  cache: true
  cache_params:
    type: redis
    host: redis
    port: 6379
    ttl: 3600  # 1 hora
```

### Rate Limiting

```yaml
general_settings:
  # Limite global
  max_parallel_requests: 100
  global_max_parallel_requests: 1000

# Por chave
curl -X POST http://localhost:4000/key/generate \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -d '{
    "rpm_limit": 60,
    "tpm_limit": 100000
  }'
```

## 🎯 Integração com AFFiNE

### Como o AFFiNE Usa o LiteLLM

1. **AFFiNE Server** faz requisições para `http://localhost:4000`
2. **LiteLLM** roteia para o provedor correto (Bedrock, OpenAI, etc)
3. **LiteLLM** registra uso, custos e métricas
4. Resposta volta para o AFFiNE

### Modificar para Usar Chaves por Workspace

Para implementar controle por workspace, você precisaria:

1. **Criar chaves no LiteLLM** para cada workspace
2. **Armazenar no banco** do AFFiNE (tabela `workspace_features` ou nova tabela)
3. **Modificar o código** do Copilot para usar a chave do workspace:

```typescript
// Em packages/backend/server/src/plugins/copilot/providers/openai.ts
// Modificar para pegar a chave do workspace

async getWorkspaceLiteLLMKey(workspaceId: string): Promise<string> {
  // Buscar do banco
  const workspace = await this.db.workspace.findUnique({
    where: { id: workspaceId },
    include: { litellmKey: true }
  });
  
  return workspace.litellmKey || this.config.apiKey; // fallback
}

// Usar na requisição
const apiKey = await this.getWorkspaceLiteLLMKey(workspaceId);
```

## 🐛 Troubleshooting

### LiteLLM não inicia

```bash
# Ver logs detalhados
docker compose logs litellm

# Verificar se PostgreSQL está pronto
docker compose ps postgres
```

### Erro "Model not found"

Verifique se o modelo está disponível na sua região AWS:
```bash
aws bedrock list-foundation-models --region us-east-1
```

### Erro "Access Denied"

Verifique as permissões IAM:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### AFFiNE não conecta ao LiteLLM

Verifique se está usando `localhost` e não `127.0.0.1`:
```env
COPILOT_OPENAI_BASE_URL=http://localhost:4000
```

Se estiver rodando AFFiNE em Docker também, use o nome do serviço:
```env
COPILOT_OPENAI_BASE_URL=http://litellm:4000
```

## 📚 Recursos

- [LiteLLM Docs](https://docs.litellm.ai/)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/proxy/deploy)
- [Virtual Keys](https://docs.litellm.ai/docs/proxy/virtual_keys)
- [Budget Management](https://docs.litellm.ai/docs/proxy/budget_alerts)
- [AWS Bedrock Setup](https://docs.litellm.ai/docs/providers/bedrock)

## ✅ Checklist

- [ ] Configurar credenciais AWS em `.docker/dev/.env`
- [ ] Mudar `LITELLM_MASTER_KEY` para produção
- [ ] Iniciar containers: `docker compose up -d`
- [ ] Verificar LiteLLM: `curl http://localhost:4000/health`
- [ ] Iniciar AFFiNE server: `yarn workspace @affine/server dev`
- [ ] Testar IA no AFFiNE
- [ ] (Opcional) Configurar virtual keys por workspace
- [ ] (Opcional) Habilitar cache Redis
- [ ] (Opcional) Configurar rate limiting
- [ ] (Opcional) Adicionar outros provedores (Azure, Vertex, etc)

## 🎉 Pronto!

Agora você tem:
- ✅ LiteLLM rodando em container
- ✅ Claude via AWS Bedrock configurado
- ✅ Features premium habilitadas (selfhosted)
- ✅ Controle de custos e rate limiting
- ✅ Suporte para múltiplos provedores
