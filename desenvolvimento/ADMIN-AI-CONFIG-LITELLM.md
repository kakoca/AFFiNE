# Configuração de IA no Admin Panel (LiteLLM + AWS Bedrock)

## 🎯 Objetivo

Configurar o AFFiNE para usar Claude via LiteLLM e AWS Bedrock.

## 📋 Pré-requisitos

- ✅ LiteLLM rodando (`docker compose ps litellm`)
- ✅ AWS Bedrock configurado no `.env`
- ✅ Conta admin criada
- ✅ Logado no painel admin (`http://localhost:3010/admin`)

---

## 🔧 Configuração no Admin Panel

Acesse: `http://localhost:3010/admin/ai`

### 1. Enable Copilot Plugin

✅ **Marque a checkbox:** "Whether to enable the copilot plugin"

---

### 2. Custom Models Configuration

**Campo:** "Use custom models in scenarios and override default settings"

**Valor:**
```json
{
  "override_enabled": true,
  "scenarios": {
    "audio_transcribing": "claude-3-haiku",
    "chat": "claude-4-5-sonnet",
    "embedding": "titan-embed-text",
    "image": "claude-4-5-sonnet",
    "rerank": "claude-4-5-sonnet",
    "coding": "claude-4-5-sonnet",
    "complex_text_generation": "claude-3-5-sonnet",
    "quick_decision_making": "claude-4-5-haiku",
    "quick_text_generation": "claude-3-haiku",
    "polish_and_summarize": "claude-3-haiku"
  }
}
```

**Explicação:**
- `override_enabled: true` - Habilita uso de modelos customizados
- Cada cenário mapeia para um modelo do seu `litellm_config.yaml`
- Modelos mais rápidos (haiku) para tarefas simples
- Modelos mais potentes (sonnet) para tarefas complexas

---

### 3. OpenAI Provider (Proxy para LiteLLM)

**Campo:** "The config for the openai provider"

**Valor:**
```json
{
  "apiKey": "sk-affine-dev-key",
  "baseURL": "http://localhost:4000/v1"
}
```

**Explicação:**
- `apiKey` - Chave configurada no LiteLLM (`.env`: `LITELLM_MASTER_KEY`)
- `baseURL` - Endpoint do LiteLLM (compatível com OpenAI API)

**⚠️ IMPORTANTE:** 
- Use `http://localhost:4000/v1` (com `/v1` no final)
- A chave deve ser a mesma do `LITELLM_MASTER_KEY` no `.env`

---

### 4. Gemini Provider (Deixar Vazio)

**Campo:** "The config for the gemini provider"

**Valor:**
```json
{
  "apiKey": "",
  "baseURL": "https://generativelanguage.googleapis.com/v1beta"
}
```

**Explicação:** Não vamos usar Gemini, deixe vazio.

---

### 5. Perplexity Provider (Deixar Vazio)

**Campo:** "The config for the perplexity provider"

**Valor:**
```json
{
  "apiKey": ""
}
```

---

### 6. Anthropic Provider (Deixar Vazio)

**Campo:** "The config for the anthropic provider"

**Valor:**
```json
{
  "apiKey": "",
  "baseURL": "https://api.anthropic.com/v1"
}
```

**Explicação:** 
- Não use este campo para AWS Bedrock
- O LiteLLM já gerencia a conexão com Bedrock
- Deixe vazio para evitar conflitos

---

### 7. Fal Provider (Deixar Vazio)

**Campo:** "The config for the fal provider"

**Valor:**
```json
{
  "apiKey": ""
}
```

---

### 8. Unsplash Key (Opcional)

**Campo:** "The config for the unsplash key"

**Valor:**
```json
{
  "key": ""
}
```

**Explicação:** Para busca de imagens. Opcional.

---

### 9. Exa Web Search Key (Opcional)

**Campo:** "The config for the exa web search key"

**Valor:**
```json
{
  "key": ""
}
```

**Explicação:** Para busca na web. Opcional.

---

### 10. Copilot Storage

**Storage Provider:**
```
fs
```

**Bucket Name:**
```
copilot
```

**Storage Config:**
```json
{
  "path": "~/.affine/storage"
}
```

**Explicação:** Armazenamento local para blobs do copilot.

---

## 🔄 Fluxo de Funcionamento

```
┌─────────────┐
│   AFFiNE    │
│  Frontend   │
└──────┬──────┘
       │ GraphQL
       ↓
┌─────────────┐
│   AFFiNE    │
│   Backend   │ (pensa que está falando com OpenAI)
└──────┬──────┘
       │ HTTP POST /v1/chat/completions
       ↓
┌─────────────┐
│  LiteLLM    │ (traduz para formato Bedrock)
│   Proxy     │
└──────┬──────┘
       │ AWS SDK
       ↓
┌─────────────┐
│ AWS Bedrock │
│   Claude    │
└─────────────┘
```

---

## ✅ Verificação

### 1. Verificar LiteLLM

```bash
# Ver logs do LiteLLM
docker logs affine_dev_services-litellm-1 --tail 50

# Testar endpoint
curl http://localhost:4000/health
```

### 2. Verificar Modelos Disponíveis

```bash
curl http://localhost:4000/v1/models \
  -H "Authorization: Bearer sk-affine-dev-key"
```

Deve retornar lista com:
- `claude-4-5-sonnet`
- `claude-4-5-haiku`
- `claude-3-5-sonnet`
- `claude-3-haiku`
- `titan-embed-text`

### 3. Testar Chat

```bash
curl http://localhost:4000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -d '{
    "model": "claude-4-5-sonnet",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 4. Verificar no AFFiNE

1. Abra um documento
2. Selecione texto
3. Clique no botão de IA
4. Deve funcionar sem erros!

---

## 🐛 Troubleshooting

### Erro: "No copilot provider available"

**Causa:** OpenAI provider não configurado ou URL incorreta

**Solução:**
1. Verifique `baseURL: http://localhost:4000/v1` (com `/v1`)
2. Verifique `apiKey: sk-affine-dev-key`
3. Reinicie o backend AFFiNE

### Erro: "Unauthorized" ou "Invalid API Key"

**Causa:** API key incorreta

**Solução:**
1. Verifique `.env`: `LITELLM_MASTER_KEY=sk-affine-dev-key`
2. Use a mesma chave no admin panel
3. Reinicie LiteLLM: `docker compose restart litellm`

### Erro: "Model not found"

**Causa:** Nome do modelo no admin não existe no LiteLLM

**Solução:**
1. Verifique `litellm_config.yaml` - campo `model_name`
2. Use exatamente o mesmo nome no admin panel
3. Modelos disponíveis:
   - `claude-4-5-sonnet`
   - `claude-4-5-haiku`
   - `claude-3-5-sonnet`
   - `claude-3-opus`
   - `claude-3-sonnet`
   - `claude-3-haiku`
   - `titan-embed-text`

### Erro: "Connection refused" ou "ECONNREFUSED"

**Causa:** LiteLLM não está rodando ou URL incorreta

**Solução:**
1. Verifique se LiteLLM está rodando:
   ```bash
   docker compose ps litellm
   ```
2. Se não estiver, inicie:
   ```bash
   docker compose up -d litellm
   ```
3. Verifique logs:
   ```bash
   docker logs affine_dev_services-litellm-1
   ```

### Erro: AWS Bedrock "Access Denied"

**Causa:** Credenciais AWS incorretas ou sem permissão

**Solução:**
1. Verifique `.env`:
   ```env
   AWS_ACCESS_KEY_ID=sua-chave
   AWS_SECRET_ACCESS_KEY=sua-secret
   AWS_REGION_NAME=us-east-1
   ```
2. Verifique permissões IAM:
   - `bedrock:InvokeModel`
   - `bedrock:InvokeModelWithResponseStream`
3. Verifique se os modelos estão habilitados no Bedrock Console

### Logs Úteis

```bash
# Backend AFFiNE
# Procure por: [CopilotProviderFactory] ou [Copilot]

# LiteLLM
docker logs affine_dev_services-litellm-1 --tail 100 -f

# PostgreSQL (se necessário)
docker logs affine_dev_services-postgres-1 --tail 50
```

---

## 📊 Mapeamento de Modelos Recomendado

| Cenário | Modelo | Motivo |
|---------|--------|--------|
| chat | claude-4-5-sonnet | Melhor qualidade para conversas |
| coding | claude-4-5-sonnet | Melhor para código |
| complex_text_generation | claude-3-5-sonnet | Bom custo-benefício |
| quick_text_generation | claude-3-haiku | Rápido e barato |
| quick_decision_making | claude-4-5-haiku | Rápido com boa qualidade |
| polish_and_summarize | claude-3-haiku | Suficiente para resumos |
| audio_transcribing | claude-3-haiku | Tarefa simples |
| embedding | titan-embed-text | Específico para embeddings |
| image | claude-4-5-sonnet | Suporta visão |
| rerank | claude-4-5-sonnet | Melhor compreensão |

---

## 🎯 Resumo da Configuração

1. ✅ **Enable Copilot Plugin** - Marcar checkbox
2. ✅ **Custom Models** - `override_enabled: true` + mapeamento de cenários
3. ✅ **OpenAI Provider** - Apontar para LiteLLM (`http://localhost:4000/v1`)
4. ✅ **Outros Providers** - Deixar vazios
5. ✅ **Salvar** - Clicar em "Save"
6. ✅ **Testar** - Usar IA em um documento

---

## 🔐 Segurança

**Desenvolvimento:**
- API Key simples: `sk-affine-dev-key`
- Sem autenticação adicional

**Produção:**
- Use chaves fortes e únicas
- Configure rate limiting no LiteLLM
- Use HTTPS
- Considere usar virtual keys do LiteLLM para diferentes workspaces
- Monitore uso via LiteLLM dashboard

---

## 📚 Referências

- [LiteLLM Docs](https://docs.litellm.ai/)
- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [AFFiNE Self-Host Docs](https://docs.affine.pro/self-host-affine/)
