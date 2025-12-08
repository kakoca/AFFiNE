# Como Habilitar Embeddings do Workspace

## 🎯 O Que São Embeddings?

Embeddings são representações vetoriais dos documentos que permitem:
- **Busca semântica**: Encontrar documentos por significado, não apenas palavras-chave
- **Contexto para IA**: O Copilot pode entender melhor o conteúdo dos documentos
- **Busca inteligente**: Encontrar documentos relacionados mesmo sem palavras exatas

## 📍 Como Acessar as Configurações

### Via Interface Web

1. Abra o AFFiNE no navegador: `http://localhost:3010`
2. Faça login com sua conta admin
3. Clique no ícone de **Configurações** (engrenagem) no canto superior direito
4. No menu lateral, procure por **"Workspace Settings"**
5. Clique em **"Embedding"** (ícone de IA)

### Caminho Completo
```
Settings → Workspace Settings → Embedding
```

## ⚙️ Configurações Disponíveis

### 1. **Workspace Embedding Switch**
- **Título**: "Enable workspace embedding"
- **Descrição**: Habilita a geração automática de embeddings para todos os documentos do workspace
- **Test ID**: `workspace-embedding-setting-switch`
- **Ação**: Toggle ON/OFF

**Como habilitar:**
```
1. Clique no switch para ativar
2. Aguarde a confirmação
3. O sistema começará a gerar embeddings automaticamente
```

### 2. **Embedding Progress**
- **Título**: "Embedding progress"
- **Descrição**: Mostra o status da sincronização dos embeddings
- **Estados**:
  - `Loading sync status...` - Carregando
  - `Synced` - Todos os documentos foram processados
  - `Syncing...` - Processando documentos

### 3. **Additional Attachments**
- **Título**: "Additional attachments"
- **Descrição**: Upload de arquivos externos para incluir no contexto do Copilot
- **Formatos suportados**: TXT, PDF, DOCX, etc.
- **Test ID**: `workspace-embedding-setting-upload-button`

**Como adicionar arquivos:**
```
1. Clique em "Upload file"
2. Selecione os arquivos do seu computador
3. Aguarde o upload e processamento
4. Os arquivos aparecerão na lista de anexos
```

### 4. **Ignore Docs**
- **Título**: "Ignore docs"
- **Descrição**: Selecione documentos que NÃO devem ser incluídos nos embeddings
- **Test ID**: `workspace-embedding-setting-ignore-docs-button`

**Como ignorar documentos:**
```
1. Clique em "Select doc"
2. Escolha os documentos a ignorar
3. Confirme a seleção
4. Os documentos serão excluídos dos embeddings
```

## 🔧 Configuração via GraphQL

Se preferir configurar via API:

### Habilitar Embeddings
```graphql
mutation EnableWorkspaceEmbedding($workspaceId: String!) {
  enableWorkspaceEmbedding(workspaceId: $workspaceId)
}
```

### Verificar Status
```graphql
query GetEmbeddingStatus($workspaceId: String!) {
  getEmbeddingStatus(workspaceId: $workspaceId) {
    enabled
    synced
    progress
  }
}
```

### Adicionar Arquivo ao Contexto
```graphql
mutation AddContextFile($input: AddContextFileInput!) {
  addContextFile(input: $input) {
    id
    name
    status
  }
}
```

## 📊 Verificação de Funcionamento

### 1. Verificar se Embeddings Estão Habilitados

**Via Interface:**
- Vá em Settings → Workspace → Embedding
- Verifique se o switch está ON
- Veja o status de sincronização

**Via Logs do Servidor:**
```bash
# Procure por logs de embedding
yarn workspace @affine/server start | grep -i "embedding"
```

### 2. Verificar se Documentos Foram Processados

**Via GraphQL:**
```graphql
query CheckEmbeddings($workspaceId: String!) {
  workspace(id: $workspaceId) {
    embeddingStatus {
      enabled
      synced
      totalDocs
      processedDocs
    }
  }
}
```

### 3. Testar Busca Semântica

**Via Copilot:**
```
Pergunta: "Encontre documentos sobre configuração de IA"
```

O Copilot deve usar a ferramenta `docSemanticSearch` se os embeddings estiverem disponíveis.

## 🚨 Troubleshooting

### Problema 1: Switch não habilita
**Sintomas**: Ao clicar no switch, ele volta para OFF
**Causas possíveis**:
- Modelo de embedding não configurado no Admin Panel
- Provider de IA não disponível
- Erro de permissões

**Solução**:
1. Verifique Admin Panel → AI → Custom Models
2. Confirme que há um modelo para `embedding` (ex: `titan-embed-text`)
3. Verifique logs do servidor para erros

### Problema 2: Sincronização travada
**Sintomas**: Status fica em "Syncing..." indefinidamente
**Causas possíveis**:
- Erro ao gerar embeddings
- Provider de IA offline
- Documentos muito grandes

**Solução**:
1. Verifique logs do servidor
2. Teste o provider de embedding manualmente
3. Verifique se o LiteLLM está respondendo

### Problema 3: Copilot não encontra documentos
**Sintomas**: Busca semântica retorna vazio
**Causas possíveis**:
- Embeddings não foram gerados
- Documentos estão na lista de ignorados
- Permissões insuficientes

**Solução**:
1. Verifique se embeddings estão habilitados
2. Confirme que documentos não estão ignorados
3. Verifique permissões do usuário

## 📝 Modelo de Embedding Recomendado

Para AWS Bedrock via LiteLLM:

```yaml
# .docker/dev/litellm_config.yaml
model_list:
  - model_name: titan-embed-text
    litellm_params:
      model: bedrock/amazon.titan-embed-text-v2:0
      aws_access_key_id: ${AWS_ACCESS_KEY_ID}
      aws_secret_access_key: ${AWS_SECRET_ACCESS_KEY}
      aws_region_name: ${AWS_REGION}
```

**Admin Panel → AI → Custom Models:**
```json
{
  "override_enabled": true,
  "scenarios": {
    "embedding": "titan-embed-text"
  }
}
```

## 🎯 Próximos Passos

Após habilitar embeddings:

1. ✅ Aguarde a sincronização completa
2. ✅ Teste busca semântica no Copilot
3. ✅ Adicione arquivos externos se necessário
4. ✅ Configure documentos a ignorar
5. ✅ Monitore o status de sincronização

## 📚 Referências

- **Componente Frontend**: `packages/frontend/core/src/modules/workspace-indexer-embedding/view/embedding-settings.tsx`
- **Backend Service**: `packages/backend/server/src/plugins/copilot/embedding/`
- **GraphQL Schema**: `packages/common/graphql/src/schema.ts`
- **Testes E2E**: `tests/affine-cloud-copilot/e2e/settings/embedding.spec.ts`

## 💡 Dicas

1. **Performance**: Embeddings são gerados de forma assíncrona, não bloqueiam o uso do sistema
2. **Custo**: Cada documento gera uma chamada ao modelo de embedding (considere custos da AWS)
3. **Atualização**: Documentos modificados são re-processados automaticamente
4. **Privacidade**: Embeddings são armazenados localmente no PostgreSQL
5. **Backup**: Embeddings podem ser regenerados a qualquer momento

## ⚡ Comando Rápido

Para verificar status via curl:

```bash
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "query { workspace(id: \"WORKSPACE_ID\") { embeddingStatus { enabled synced } } }"
  }'
```
