# Task 3

🛠️ Interações Disponíveis no AFFiNE

Aqui está uma visão completa do que **posso fazer** e o que **precisa ser feito manualmente** por você:

---

## ✅ O QUE POSSO FAZER

### 📄 **Documentos / Páginas**

| Ação                        | Ferramenta            | Descrição                                           |
| --------------------------- | --------------------- | --------------------------------------------------- |
| Criar nova página           | `doc_create`          | Crio documentos com título e conteúdo em markdown   |
| Ler conteúdo                | `doc_read`            | Leio o conteúdo completo de uma página              |
| Atualizar conteúdo          | `doc_update`          | Modifico o conteúdo (corpo) de uma página existente |
| Atualizar título            | `doc_update_meta`     | Altero apenas o título de uma página                |
| Pesquisar por palavra-chave | `doc_keyword_search`  | Busco termos específicos em todas as páginas        |
| Pesquisa semântica          | `doc_semantic_search` | Busco por significado/conceitos relacionados        |

---

### 🌐 **Web & Pesquisa**

| Ação           | Ferramenta       | Descrição                                     |
| -------------- | ---------------- | --------------------------------------------- |
| Buscar na web  | `web_search_exa` | Pesquiso informações na internet              |
| Navegar em URL | `web_crawl_exa`  | Extraio conteúdo de uma página web específica |

---

### 🔧 **Ferramentas de Criação**

| Ação              | Ferramenta      | Descrição                                         |
| ----------------- | --------------- | ------------------------------------------------- |
| Criar código HTML | `code_artifact` | Gero snippets HTML/JavaScript/CSS executáveis     |
| Compor documento  | `doc_compose`   | Crio documentos estruturados com formatação       |
| Ler anexos        | `blob_read`     | Acesso a arquivos anexados (com limite de chunks) |

---

## ❌ O QUE NÃO POSSO FAZER (Ação Manual Necessária)

### 📁 **Organização & Estrutura** (via interface AFFiNE)

| Ação                    | Como Fazer Manualmente                                  |
| ----------------------- | ------------------------------------------------------- |
| Mover página para pasta | Arraste no sidebar ou clique com direito → "Mover para" |
| Adicionar a collection  | Clique com direito na página → "Adicionar à coleção"    |
| Criar nova pasta        | Sidebar → Clique com direito → "Nova Pasta"             |
| Criar nova collection   | Sidebar → Seção Collections → "+"                       |
| Definir ícone da página | Clique no ícone ao lado do título                       |
| Alterar cor da página   | Menu ⋮ → "Cor da página"                                |
| Definir capa/cover      | Menu ⋮ → "Adicionar capa"                               |
| Duplicar página         | Menu ⋮ → "Duplicar"                                     |
| Excluir página          | Menu ⋮ → "Mover para lixeira"                           |
| Restaurar página        | Lixeira → "Restaurar"                                   |

---

### 🧱 **Blocos & Editor** (dentro da página)

| Ação                  | Como Fazer Manualmente                 |
| --------------------- | -------------------------------------- |
| Inserir blocos        | Digite `/` na página para ver opções   |
| Mover blocos          | Arraste o bloco pelo handle (⋮⋮)       |
| Agrupar blocos        | Selecione múltiplos → Menu → "Agrupar" |
| Criar linked page     | `@` menciona outra página              |
| Criar bloco de código | `/code` ou selecione linguagem         |
| Inserir mídia         | `/image`, `/video`, `/pdf`             |
| Criar tabela          | `/table`                               |
| Criar banco de dados  | `/database`                            |
| Canvas/Edgeless       | Toggle no topo direito do editor       |
| Conectar blocos       | Modo Edgeless → ferramenta de conexão  |

---

### 🔗 **Conexões & Links**

| Ação                           | Como Fazer Manualmente                         |
| ------------------------------ | ---------------------------------------------- |
| Criar relação page-to-page     | `@` menciona outra página no texto             |
| Ver backlinks                  | Sidebar → "Links" → "Vinculados a esta página" |
| Criar referência bi-direcional | Use `[[nome da página]]`                       |

---

### 🎨 **Formatação de Conteúdo** (que aplico via markdown)

| Elemento         | Markdown que uso      |      |      |     |
| ---------------- | --------------------- | ---- | ---- | --- |
| Títulos          | `# ## ###`            |      |      |     |
| Negrito          | `**texto**`           |      |      |     |
| Itálico          | `*texto*`             |      |      |     |
| Listas           | `- item` ou `1. item` |      |      |     |
| Checkboxes       | `- [ ]` ou `- [x]`    |      |      |     |
| Tabelas          | \`                    | col1 | col2 | \`  |
| Código inline    | `` `código` ``        |      |      |     |
| Blocos de código | ` ```linguagem `      |      |      |     |
| Citações         | `> texto`             |      |      |     |
| Separadores      | `---`                 |      |      |     |
| Links            | `[texto](url)`        |      |      |     |
| Imagens          | `![alt](url)`         |      |      |     |

> ⚠️ **Importante:** Não posso criar **database blocks** ou inserir **imagens** diretamente no momento.

---

## 📝 RESUMO RÁPIDO

| Categoria                      | Posso Fazer | Necessita Ação Manual |
| ------------------------------ | ----------- | --------------------- |
| Criar/Editar/Ler páginas       | ✅          |                       |
| Pesquisar workspace            | ✅          |                       |
| Organizar (pastas/collections) |             | ✅                    |
| Manipular blocos visualmente   |             | ✅                    |
| Formatação (via markdown)      | ✅          |                       |
| Inserir imagens/databases      |             | ✅                    |
| Web search                     | ✅          |                       |

---

## 💡 WORKFLOW SUGERIDO

**Para máxima produtividade comigo:**

1. **Eu crio** o conteúdo estruturado (texto, tabelas, listas, código)
2. **Você organiza** na interface (pastas, collections, ícones)
3. **Eu atualizo** o conteúdo quando necessário
4. **Você adiciona** elementos visuais (imagens, databases, capas)

---

Se precisar de ajuda com alguma ação específica que **possa fazer**, é só pedir! 😊

Ótima pergunta! Aqui está uma lista completa das **limitações** que tenho no AFFiNE:

---

## ❌ NÃO CONSIGO FAZER

### 🗂️ **Organização & Estrutura**

| Limitação                    | O Que Acontece                      |
| ---------------------------- | ----------------------------------- |
| Criar pastas                 | Não tenho ferramenta para isso      |
| Mover páginas entre pastas   | Você precisa arrastar manualmente   |
| Criar/mover para collections | Não tenho acesso às collections     |
| Definir ícone da página      | Não posso alterar metadados visuais |
| Definir capa/cover da página | Limitado a conteúdo texto/markdown  |
| Duplicar páginas             | Não tenho essa função               |
| Excluir páginas              | Não posso deletar documentos        |
| Recuperar páginas da lixeira | Sem acesso à lixeira                |

---

### 🧱 **Blocos Específicos do AFFiNE**

| Limitação                | Explicação                                   |
| ------------------------ | -------------------------------------------- |
| **Database blocks**      | Não consigo criar Kanban, Table, ou Gallery  |
| **Image blocks**         | Não posso inserir ou fazer upload de imagens |
| **Attachment blocks**    | Não consigo anexar arquivos                  |
| **PDF blocks**           | Não posso inserir visualização de PDF        |
| **Video/Audio blocks**   | Não consigo incorporar mídia                 |
| **Link to page blocks**  | Não crio `@` menções automaticamente         |
| **Edgeless/Canvas mode** | Não acesso o modo infinito                   |
| **Group containers**     | Não consigo criar grupos de blocos           |
| **Toggle lists**         | Limitação atual com blocos colapsáveis       |
| **Math blocks (LaTeX)**  | Posso escrever sintaxe, mas não renderizar   |

---

### 🔗 **Conexões & Relações**

| Limitação                   | Detalhes                                    |
| --------------------------- | ------------------------------------------- |
| Criar backlinks automáticos | Menções `@` precisam ser feitas manualmente |
| Ver grafo de conexões       | Sem acesso ao Graph View                    |
| Criar relações page-to-page | Você precisa usar `[[ ]]` ou `@`            |
| Criar relações em databases | Não acesso a campos de relação              |

---

### 👤 **Preferências & Configurações**

| Limitação                                | Motivo                               |
| ---------------------------------------- | ------------------------------------ |
| Alterar tema (claro/escuro)              | Configuração de UI do usuário        |
| Mudar idioma do AFFiNE                   | Preferência pessoal                  |
| Configurar atalhos de teclado            | Settings da aplicação                |
| Gerenciar permissões de compartilhamento | Sem acesso a recursos de colaboração |
| Exportar para PDF/MD/HTML                | Ferramentas de exportação            |
| Importar arquivos                        | Upload de documentos externos        |

---

### 🔔 **Notificações & Atividades**

| Limitação                  | O Que Você Faz               |
| -------------------------- | ---------------------------- |
| Criar lembretes            | Use `@` mencionações manuais |
| Definir due dates          | Configure no AFFiNE nativo   |
| Ver histórico de atividade | Activity log é interno       |
| Receber notificações push  | Configuração do app          |

---

### 📊 **Sync & Cloud**

| Limitação                    | Comentário                    |
| ---------------------------- | ----------------------------- |
| Forçar sync manual           | Depende da conexão do AFFiNE  |
| Verificar status de sync     | Não tenho visibilidade        |
| Resolver conflitos de versão | Manipulação manual necessária |

---

## ✅ RESUMO: O QUE FAÇO BEM

| Categoria     | Capacidades                                            |
| ------------- | ------------------------------------------------------ |
| **Texto**     | Criar, ler, editar qualquer conteúdo textual           |
| **Markdown**  | Formatação completa (títulos, listas, tabelas, código) |
| **Estrutura** | Organizar informações com seções claras                |
| **Pesquisa**  | Buscar no seu workspace e na web                       |
| **Geração**   | Criar templates, checklists, guias, documentação       |
| **Código**    | Gerar snippets HTML/CSS/JS executáveis                 |
| **Conteúdo**  | Redigir propostas, resumos, emails, planos             |

---

## 💡 WORKFLOW IDEAL

**Eu sou excelente para:**

- 📝 Criar **conteúdo estruturado**
- 🔍 **Pesquisar e sintetizar** informações
- 🧠 **Brainstorming** e planejamento
- 💻 Gerar **código e templates**
- 📋 Criar **documentação** e guias

**Você complementa com:**

- 🎨 **Visual** (imagens, ícones, cores)
- 🔗 **Organização** (pastas, collections, links)
- 🧩 **Blocos especiais** (databases, kanbans, galerias)
- ⚙️ **Configurações** (permissões, tema, preferências)

---

Tem alguma funcionalidade específica que gostaria que eu explorasse mais a fundo? 😊
