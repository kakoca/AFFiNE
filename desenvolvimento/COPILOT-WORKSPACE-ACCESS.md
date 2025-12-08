# Capacidades do Copilot - Acesso ao Workspace

## ✅ Confirmação: Copilot TEM Acesso aos Documentos

O Copilot do AFFiNE **possui acesso completo** aos documentos do workspace através de ferramentas (tools) integradas.

## 🛠️ Ferramentas Disponíveis

### 1. **docRead** - Leitura de Documentos
- **Descrição**: Retorna o conteúdo completo e metadados de um documento específico
- **Uso**: Quando o usuário precisa do conteúdo completo de um arquivo específico
- **Formato**: Retorna markdown, título, datas de criação/atualização, autores
- **Permissão**: Verifica se o usuário tem permissão `Doc.Read`

### 2. **docKeywordSearch** - Busca por Palavras-chave
- **Descrição**: Busca fuzzy em todos os documentos do workspace por palavras-chave exatas
- **Uso**: Busca padrão baseada em termos ou palavras-chave
- **Retorna**: Lista de documentos com título, datas, autores
- **Permissão**: Verifica `Workspace.Read` e filtra documentos legíveis
- **Requer**: Indexer habilitado (`config.indexer.enabled`)

### 3. **docSemanticSearch** - Busca Semântica
- **Descrição**: Busca baseada em similaridade vetorial usando embeddings
- **Uso**: Quando busca por palavras-chave falha ou usuário precisa de correspondências conceituais
- **Exemplos**: Paráfrases, sinônimos, conceitos amplos, documentos recentes
- **Retorna**: Chunks de texto similares com contexto
- **Permissão**: Verifica `Workspace.Read` e permissões de documentos
- **Requer**: Embeddings gerados para os documentos

### 4. **blobRead** - Leitura de Blobs/Anexos
- **Descrição**: Lê conteúdo de blobs (imagens, arquivos anexados)
- **Uso**: Acesso a anexos e arquivos binários

### 5. **docEdit** - Edição de Documentos
- **Descrição**: Edita conteúdo de documentos
- **Uso**: Quando o Copilot precisa modificar documentos

### 6. **sectionEdit** - Edição de Seções
- **Descrição**: Edita seções específicas de documentos
- **Uso**: Edições pontuais em partes do documento

### 7. **docCompose** - Composição de Documentos
- **Descrição**: Cria novos documentos ou compõe conteúdo
- **Uso**: Geração de novos documentos

### 8. **conversationSummary** - Resumo de Conversas
- **Descrição**: Resume conversas anteriores com o Copilot
- **Uso**: Contexto de conversas longas

### 9. **codeArtifact** - Artefatos de Código
- **Descrição**: Gera e manipula artefatos de código
- **Uso**: Desenvolvimento de código

### 10. **webSearch** e **webCrawl** (Exa)
- **Descrição**: Busca na web e crawling de páginas
- **Uso**: Informações externas ao workspace
- **Requer**: Configuração do Exa API

## 🔧 Configuração das Ferramentas

As ferramentas são controladas por dois parâmetros:

### 1. `searchWorkspace` (padrão: true)
Controla acesso às ferramentas de busca:
- `docKeywordSearch`
- `docSemanticSearch`

### 2. `readingDocs` (padrão: true)
Controla acesso à leitura de documentos:
- `docRead`

## 📊 Verificação de Acesso

### Como verificar se o Copilot tem acesso:

1. **Via Admin Panel**:
   - Acesse `/admin/ai`
   - Verifique se há configuração de AI ativa
   - Confirme que há modelos configurados

2. **Via Código** (arquivo `controller.ts`):
```typescript
tools: getTools(session.config.promptConfig?.tools, toolsConfig)
```

3. **Via Logs**:
   - Procure por: `getTools: ["docRead", "docKeywordSearch", ...]`
   - Indica quais ferramentas estão ativas

## ⚠️ Possíveis Razões para "Sem Acesso"

Se o Copilot disser que não tem acesso aos documentos:

### 1. **Workspace Vazio**
- Não há documentos criados no workspace
- Solução: Criar documentos de teste

### 2. **Embeddings Não Gerados**
- Busca semântica requer embeddings
- Busca por palavras-chave requer indexação
- Solução: Gerar embeddings (ver próxima seção)

### 3. **Indexer Desabilitado**
- `docKeywordSearch` não funciona sem indexer
- Verificar: `config.indexer.enabled`

### 4. **Permissões Insuficientes**
- Usuário não tem permissão de leitura
- Verificar features e permissões do usuário

### 5. **Ferramentas Desabilitadas**
- `searchWorkspace: false` ou `readingDocs: false`
- Verificar configuração do prompt

### 6. **Copilot Não Sabe Usar as Ferramentas**
- O modelo pode não estar usando as ferramentas disponíveis
- Solução: Instruir explicitamente o Copilot a buscar documentos

## 🔍 Como Testar o Acesso

### Teste 1: Busca por Palavra-chave
```
Pergunta ao Copilot: "Busque documentos que contenham a palavra 'teste'"
```
Deve usar `docKeywordSearch`

### Teste 2: Leitura de Documento
```
Pergunta ao Copilot: "Leia o documento com ID [doc-id]"
```
Deve usar `docRead`

### Teste 3: Busca Semântica
```
Pergunta ao Copilot: "Encontre documentos sobre configuração de IA"
```
Deve usar `docSemanticSearch` (se embeddings existirem)

## 📝 Próximos Passos

1. ✅ Verificar se há documentos no workspace
2. ✅ Gerar embeddings para os documentos
3. ✅ Testar busca por palavras-chave
4. ✅ Testar busca semântica
5. ✅ Instruir explicitamente o Copilot a usar as ferramentas

## 🎯 Conclusão

O Copilot **definitivamente tem acesso** aos documentos do workspace através das ferramentas integradas. Se ele disser que não tem acesso, é porque:
- O workspace está vazio
- Os embeddings não foram gerados
- Ele não está sendo instruído corretamente a usar as ferramentas

A solução é criar documentos, gerar embeddings e instruir o Copilot explicitamente.

## 🚀 Guia Passo a Passo para Testar

### Passo 1: Criar Documentos de Teste
1. Acesse o workspace no AFFiNE
2. Crie 2-3 documentos com conteúdo relevante
3. Exemplo de conteúdo:
   - "Configuração de IA com AWS Bedrock"
   - "Setup do LiteLLM para self-hosted"
   - "Troubleshooting de embeddings"

### Passo 2: Habilitar Embeddings
1. Vá em: **Settings → Workspace Settings → Embedding**
2. Ative o switch **"Enable workspace embedding"**
3. Aguarde a sincronização completa (status: "Synced")
4. **Guia completo**: `desenvolvimento/COMO-HABILITAR-EMBEDDINGS.md`

### Passo 3: Testar Ferramentas do Copilot

**Teste 1 - Busca por Palavra-chave:**
```
Pergunta ao Copilot: "Busque documentos que contenham a palavra 'configuração'"
```
✅ Deve usar `docKeywordSearch`

**Teste 2 - Busca Semântica:**
```
Pergunta ao Copilot: "Encontre documentos sobre setup de IA"
```
✅ Deve usar `docSemanticSearch` (requer embeddings habilitados)

**Teste 3 - Leitura de Documento:**
```
Pergunta ao Copilot: "Leia o documento sobre AWS Bedrock"
```
✅ Deve usar `docRead`

### Passo 4: Instruir o Copilot Explicitamente

Se o Copilot não usar as ferramentas automaticamente, seja mais direto:

```
"Use a ferramenta de busca semântica para encontrar documentos sobre [tópico]"
"Leia o documento X e me diga o que ele contém"
"Busque por palavra-chave 'teste' nos documentos do workspace"
"Quais documentos eu tenho no workspace?"
```

### Passo 5: Verificar Logs

Monitore os logs do servidor para ver quais ferramentas estão sendo usadas:

```bash
yarn workspace @affine/server start | grep -i "getTools\|docRead\|docSearch"
```

## 📚 Documentação Relacionada

- **Habilitar Embeddings**: `desenvolvimento/COMO-HABILITAR-EMBEDDINGS.md`
- **Configuração AI**: `desenvolvimento/ADMIN-AI-CONFIG-LITELLM.md`
- **Solução Anthropic**: `desenvolvimento/SOLUCAO-ANTHROPIC-PROVIDER.md`
- **Setup Completo**: `desenvolvimento/SETUP-COMPLETO-PASSO-A-PASSO.md`
