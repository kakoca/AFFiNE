# Roteiro de Teste — AFFiNE Copilot Tools

Use este roteiro enviando cada bloco como mensagem pro Copilot AI.
Valide que cada resposta usa a tool correta e retorna sucesso.

---

## 1. Folders

### 1.1 Listar hierarquia (deve retornar vazio ou estrutura existente)

```
Liste a hierarquia completa de pastas do meu workspace.
```

### 1.2 Criar pastas

```
Crie a seguinte estrutura de pastas:
- Projetos
  - Projeto Alpha
  - Projeto Beta
- Arquivo
```

### 1.3 Verificar hierarquia

```
Mostre a hierarquia de pastas atualizada.
```

### 1.4 Mover pasta

```
Mova a pasta "Projeto Beta" para dentro de "Arquivo".
```

### 1.5 Mover documento para pasta

```
Mova o documento atual para a pasta "Projeto Alpha".
```

### 1.6 Deletar pasta vazia

```
Delete a pasta "Arquivo" (se estiver vazia). Se não estiver, me diga o que tem dentro.
```

---

## 2. Collections

### 2.1 Listar collections

```
Liste todas as collections do workspace.
```

### 2.2 Criar collection manual

```
Crie uma collection chamada "Documentos Importantes" e adicione o documento atual nela.
```

### 2.3 Criar collection com filtros

```
Crie uma smart collection chamada "Recentes" que filtre documentos atualizados depois de 2024-01-01.
```

### 2.4 Listar novamente (deve mostrar 2)

```
Quantas collections existem agora? Liste todas com detalhes.
```

### 2.5 Atualizar collection

```
Renomeie a collection "Documentos Importantes" para "Docs Prioritários".
```

### 2.6 Adicionar/remover docs

```
Adicione mais 2 documentos à collection "Docs Prioritários". Depois remova um deles.
```

### 2.7 Deletar collection

```
Delete a collection "Recentes".
```

---

## 3. Database

### 3.1 Criar database

```
Crie um database chamado "Backlog" neste documento com as seguintes colunas:
- Title (título)
- Status (select: Todo, In Progress, Done)
- Priority (select: Low, Medium, High, Critical)
- Due Date (date)
- Assignee (text)
```

### 3.2 Listar databases

```
Liste todos os databases neste documento.
```

### 3.3 Ler estrutura

```
Leia a estrutura completa do database "Backlog", incluindo colunas e tipos.
```

### 3.4 Adicionar linhas

```
Adicione estas linhas ao database Backlog:
1. "Configurar CI/CD" - Status: Todo, Priority: High, Due: 2024-04-15
2. "Escrever testes E2E" - Status: In Progress, Priority: Medium, Due: 2024-04-20
3. "Documentar API" - Status: Todo, Priority: Low, Due: 2024-04-30
```

### 3.5 Consultar com filtros

```
Mostre todas as tarefas do Backlog com status "Todo", ordenadas por prioridade.
```

### 3.6 Atualizar células

```
Marque "Configurar CI/CD" como "In Progress" e mude a prioridade para "Critical".
```

---

## 4. Task Tools (wrappers de database)

### 4.1 Criar tasks

```
Crie as seguintes tasks no database Backlog:
- "Review PR #42" com status In Progress, prioridade High, assignee "João"
- "Deploy staging" com status Todo, prioridade Critical, due date amanhã
```

### 4.2 Consultar tasks por status

```
Quais tasks estão "In Progress"? Me dê um resumo com estatísticas.
```

### 4.3 Consultar tasks por prioridade

```
Liste todas as tasks com prioridade Critical ou High.
```

---

## 5. Fluxo Integrado (usa múltiplas tools)

### 5.1 Organização completa

```
Faça o seguinte:
1. Crie uma pasta chamada "Sprint 1"
2. Mova este documento para essa pasta
3. Crie uma collection chamada "Sprint 1 Docs" com este documento
4. Me mostre um resumo do que foi feito
```

### 5.2 Relatório cruzado

```
Me dê um relatório completo:
- Quantas pastas existem e qual a hierarquia
- Quantas collections existem
- Quantas tasks existem no Backlog e qual o status de cada uma
```

---

## Checklist de Validação

Para cada teste, verificar:

- [ ] Tool correta foi chamada (não usou database_add_rows quando deveria usar task_create, etc.)
- [ ] Resposta contém dados reais (IDs, nomes, contagens)
- [ ] Erros são tratados graciosamente (ex: deletar pasta não-vazia)
- [ ] Fluxo integrado usa múltiplas tools em sequência
- [ ] AI lê antes de escrever (database_read antes de database_add_rows)
- [ ] Sem alucinação de IDs ou dados
