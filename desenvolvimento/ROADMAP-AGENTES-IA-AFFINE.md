# Roadmap: Agentes IA e Automações no AFFiNE

## 🎯 Visão Geral

Implementar capacidades avançadas de IA no AFFiNE inspiradas no Notion AI:
1. **Agentes Autônomos**: Delegar tarefas para agentes IA
2. **Edição Direta de Documentos**: IA edita sem copiar/colar
3. **Inserção de Databases**: IA cria e insere databases
4. **Referências Cross-Page**: Referenciar databases entre páginas

## 📊 Análise das Funcionalidades

### 1. Edição Direta de Documentos (Mais Simples)

**Status Atual**: ✅ Parcialmente implementado

O AFFiNE já tem a tool `docEdit` que permite edição:

```typescript
// packages/backend/server/src/plugins/copilot/tools/doc-edit.ts
export function createDocEditTool(
  factory: CopilotProviderFactory,
  prompt: PromptService,
  getDocContent: GetDocContent
): Tool {
  return tool({
    description: 'Edit a document by applying changes to specific sections',
    parameters: z.object({
      docId: z.string().describe('The ID of the document to edit'),
      changes: z.array(z.object({
        section: z.string().describe('Section to modify'),
        newContent: z.string().describe('New content for the section')
      }))
    }),
    execute: async ({ docId, changes }) => {
      // Aplica mudanças no documento
    }
  });
}
```

**O que falta**:
- ✅ Tool já existe
- ⚠️ Precisa melhorar UX no frontend
- ⚠️ Adicionar confirmação visual das mudanças
- ⚠️ Implementar "undo" para mudanças da IA

**Como melhorar**:

```typescript
// Adicionar tool para edição mais granular
export function createDocComposeToolEnhanced(): Tool {
  return tool({
    description: 'Compose or edit document content with rich formatting',
    parameters: z.object({
      docId: z.string(),
      operation: z.enum(['append', 'prepend', 'replace', 'insert']),
      position: z.number().optional(),
      content: z.string(),
      format: z.enum(['markdown', 'plain', 'blocksuite']).default('markdown')
    }),
    execute: async ({ docId, operation, position, content, format }) => {
      // Implementar edição com suporte a diferentes formatos
      const doc = await getDoc(docId);
      
      switch (operation) {
        case 'append':
          doc.append(parseContent(content, format));
          break;
        case 'insert':
          doc.insertAt(position, parseContent(content, format));
          break;
        // ...
      }
      
      return { success: true, docId, changes: [...] };
    }
  });
}
```

### 2. Inserção de Databases (Médio)

**Status Atual**: ❌ Não implementado

**Arquitetura Necessária**:

```typescript
// Nova tool: createDatabaseTool
export function createDatabaseTool(): Tool {
  return tool({
    description: 'Create and insert a database/table into a document',
    parameters: z.object({
      docId: z.string().describe('Document to insert database'),
      position: z.number().optional(),
      database: z.object({
        name: z.string(),
        columns: z.array(z.object({
          name: z.string(),
          type: z.enum(['text', 'number', 'select', 'multi-select', 'date', 'checkbox', 'url', 'email', 'phone', 'file', 'relation']),
          data: z.record(z.unknown()).optional()
        })),
        rows: z.array(z.record(z.unknown())).optional()
      })
    }),
    execute: async ({ docId, position, database }) => {
      const doc = await getDoc(docId);
      
      // Criar database usando BlockSuite
      const databaseBlock = doc.addBlock('affine:database', {
        columns: database.columns.map(col => ({
          id: generateId(),
          name: col.name,
          type: col.type,
          data: col.data || {}
        })),
        cells: {},
        title: database.name
      }, position);
      
      // Adicionar rows se fornecidas
      if (database.rows) {
        for (const row of database.rows) {
          const rowId = generateId();
          databaseBlock.cells[rowId] = row;
        }
      }
      
      return { 
        success: true, 
        databaseId: databaseBlock.id,
        url: `/workspace/${workspaceId}/${docId}#${databaseBlock.id}`
      };
    }
  });
}
```

**Integração com DataSource**:

```typescript
// Estender BlockQueryDataSource para suportar criação via IA
class AIEnhancedDataSource extends BlockQueryDataSource {
  async createFromAI(spec: {
    name: string;
    columns: ColumnSpec[];
    initialData?: Record<string, unknown>[];
  }) {
    const doc = this.block.store;
    doc.captureSync();
    
    // Criar colunas
    const columnIds = spec.columns.map(col => {
      return this.propertyAdd('end', {
        type: col.type,
        name: col.name
      });
    });
    
    // Adicionar dados iniciais
    if (spec.initialData) {
      for (const rowData of spec.initialData) {
        const rowId = this.rowAdd('end');
        for (const [colName, value] of Object.entries(rowData)) {
          const colId = columnIds.find(id => 
            this.propertyNameGet(id) === colName
          );
          if (colId) {
            this.cellValueChange(rowId, colId, value);
          }
        }
      }
    }
    
    return this.block.id;
  }
}
```

### 3. Referências Cross-Page (Médio)

**Status Atual**: ⚠️ Parcialmente implementado (links funcionam, mas não views)

**O que existe**:
- Links entre páginas: `[[Page Name]]`
- Embed de páginas: `@Page Name`

**O que falta**:
- Database views cross-page
- Sincronização bidirecional
- Filtros e sorts persistentes

**Implementação**:

```typescript
// Nova tool: createDatabaseViewTool
export function createDatabaseViewTool(): Tool {
  return tool({
    description: 'Create a view of a database from another page',
    parameters: z.object({
      targetDocId: z.string().describe('Document to insert view'),
      sourceDatabaseId: z.string().describe('Source database ID'),
      viewType: z.enum(['table', 'kanban', 'gallery', 'calendar']),
      filters: z.array(z.object({
        column: z.string(),
        operator: z.string(),
        value: z.unknown()
      })).optional(),
      sorts: z.array(z.object({
        column: z.string(),
        direction: z.enum(['asc', 'desc'])
      })).optional()
    }),
    execute: async ({ targetDocId, sourceDatabaseId, viewType, filters, sorts }) => {
      const targetDoc = await getDoc(targetDocId);
      const sourceDatabase = await getBlock(sourceDatabaseId);
      
      // Criar view block que referencia o database original
      const viewBlock = targetDoc.addBlock('affine:database-view', {
        sourceId: sourceDatabaseId,
        viewType,
        filters: filters || [],
        sorts: sorts || [],
        // Configurações da view
        config: {
          showHeader: true,
          showToolbar: true,
          // ...
        }
      });
      
      return {
        success: true,
        viewId: viewBlock.id,
        sourceId: sourceDatabaseId
      };
    }
  });
}
```

### 4. Agentes Autônomos (Complexo)

**Status Atual**: ❌ Não implementado

**Arquitetura Proposta**:

```typescript
// Sistema de Agentes
interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: AgentCapability[];
  model: string; // claude-4-5-sonnet, etc.
  systemPrompt: string;
  tools: string[]; // IDs das tools disponíveis
  memory: AgentMemory;
  status: 'idle' | 'working' | 'waiting' | 'error';
}

interface AgentCapability {
  type: 'document_editing' | 'database_management' | 'research' | 'scheduling' | 'custom';
  config: Record<string, unknown>;
}

interface AgentMemory {
  shortTerm: Message[]; // Últimas N mensagens
  longTerm: EmbeddedMemory[]; // Embeddings de interações passadas
  context: Record<string, unknown>; // Contexto persistente
}

// Backend: Agent Manager
class AgentManager {
  private agents = new Map<string, Agent>();
  
  async createAgent(spec: {
    name: string;
    description: string;
    capabilities: AgentCapability[];
    model?: string;
  }): Promise<Agent> {
    const agent: Agent = {
      id: generateId(),
      name: spec.name,
      description: spec.description,
      capabilities: spec.capabilities,
      model: spec.model || 'claude-4-5-haiku',
      systemPrompt: this.buildSystemPrompt(spec),
      tools: this.selectTools(spec.capabilities),
      memory: {
        shortTerm: [],
        longTerm: [],
        context: {}
      },
      status: 'idle'
    };
    
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  async delegateTask(agentId: string, task: {
    description: string;
    context: Record<string, unknown>;
    deadline?: Date;
  }): Promise<TaskExecution> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error('Agent not found');
    
    agent.status = 'working';
    
    // Criar execução da tarefa
    const execution: TaskExecution = {
      id: generateId(),
      agentId,
      task,
      status: 'running',
      startedAt: new Date(),
      steps: []
    };
    
    // Executar tarefa em background
    this.executeTask(agent, execution).catch(err => {
      execution.status = 'failed';
      execution.error = err.message;
    });
    
    return execution;
  }
  
  private async executeTask(agent: Agent, execution: TaskExecution) {
    // Loop de execução do agente
    while (execution.status === 'running') {
      // 1. Analisar tarefa e decidir próximo passo
      const decision = await this.getAgentDecision(agent, execution);
      
      // 2. Executar ação
      const result = await this.executeAction(agent, decision);
      
      // 3. Registrar passo
      execution.steps.push({
        action: decision.action,
        result,
        timestamp: new Date()
      });
      
      // 4. Verificar se tarefa está completa
      if (decision.isComplete) {
        execution.status = 'completed';
        execution.completedAt = new Date();
        break;
      }
      
      // 5. Atualizar memória
      agent.memory.shortTerm.push({
        role: 'assistant',
        content: JSON.stringify(result)
      });
    }
    
    agent.status = 'idle';
  }
  
  private async getAgentDecision(agent: Agent, execution: TaskExecution) {
    const provider = await this.providerFactory.getProvider({
      modelId: agent.model
    });
    
    const messages = [
      {
        role: 'system',
        content: agent.systemPrompt
      },
      ...agent.memory.shortTerm,
      {
        role: 'user',
        content: `Task: ${execution.task.description}\n\nContext: ${JSON.stringify(execution.task.context)}\n\nWhat should I do next?`
      }
    ];
    
    const response = await provider.text(
      { modelId: agent.model },
      messages,
      {
        tools: agent.tools.map(toolId => this.getTool(toolId))
      }
    );
    
    return this.parseDecision(response);
  }
}

// GraphQL API para Agentes
type Mutation {
  createAgent(input: CreateAgentInput!): Agent!
  delegateTask(agentId: ID!, task: TaskInput!): TaskExecution!
  updateAgent(id: ID!, input: UpdateAgentInput!): Agent!
  deleteAgent(id: ID!): Boolean!
}

type Query {
  agents(workspaceId: ID!): [Agent!]!
  agent(id: ID!): Agent
  taskExecutions(agentId: ID!): [TaskExecution!]!
}

type Subscription {
  taskExecutionUpdated(executionId: ID!): TaskExecution!
}
```

**Frontend: UI para Agentes**:

```typescript
// Componente de criação de agente
function CreateAgentDialog() {
  const [name, setName] = useState('');
  const [capabilities, setCapabilities] = useState<AgentCapability[]>([]);
  
  return (
    <Dialog>
      <DialogTitle>Create AI Agent</DialogTitle>
      <DialogContent>
        <TextField
          label="Agent Name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        
        <CapabilitySelector
          selected={capabilities}
          onChange={setCapabilities}
        />
        
        <ModelSelector />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCreate}>Create Agent</Button>
      </DialogActions>
    </Dialog>
  );
}

// Componente de delegação de tarefa
function DelegateTaskDialog({ agentId }: { agentId: string }) {
  const [task, setTask] = useState('');
  const [context, setContext] = useState<Record<string, unknown>>({});
  
  return (
    <Dialog>
      <DialogTitle>Delegate Task to Agent</DialogTitle>
      <DialogContent>
        <TextField
          label="Task Description"
          multiline
          rows={4}
          value={task}
          onChange={e => setTask(e.target.value)}
        />
        
        <ContextBuilder
          context={context}
          onChange={setContext}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDelegate}>Delegate</Button>
      </DialogActions>
    </Dialog>
  );
}

// Visualização de execução de tarefa
function TaskExecutionView({ executionId }: { executionId: string }) {
  const { data } = useSubscription(TASK_EXECUTION_UPDATED, {
    variables: { executionId }
  });
  
  return (
    <Card>
      <CardHeader>
        <TaskStatus status={data.status} />
      </CardHeader>
      <CardContent>
        <Timeline>
          {data.steps.map(step => (
            <TimelineItem key={step.id}>
              <TimelineContent>
                <Typography>{step.action}</Typography>
                <Typography variant="caption">
                  {step.timestamp}
                </Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
}
```

## 🗺️ Roadmap de Implementação

### Fase 1: Edição Direta (1-2 semanas)
- [ ] Melhorar tool `docEdit` existente
- [ ] Adicionar confirmação visual de mudanças
- [ ] Implementar undo/redo para mudanças da IA
- [ ] Adicionar preview antes de aplicar mudanças
- [ ] Testar com diferentes tipos de conteúdo

### Fase 2: Inserção de Databases (2-3 semanas)
- [ ] Criar tool `createDatabase`
- [ ] Integrar com BlockSuite DataSource
- [ ] Adicionar suporte a diferentes tipos de colunas
- [ ] Implementar população inicial de dados
- [ ] Testar criação via chat

### Fase 3: Referências Cross-Page (2-3 semanas)
- [ ] Criar tool `createDatabaseView`
- [ ] Implementar sincronização bidirecional
- [ ] Adicionar suporte a filtros e sorts
- [ ] Implementar cache de views
- [ ] Testar performance com databases grandes

### Fase 4: Agentes Básicos (4-6 semanas)
- [ ] Implementar AgentManager no backend
- [ ] Criar GraphQL API para agentes
- [ ] Implementar sistema de memória
- [ ] Criar UI para criação de agentes
- [ ] Implementar delegação de tarefas
- [ ] Adicionar visualização de execução
- [ ] Testar com tarefas simples

### Fase 5: Agentes Avançados (6-8 semanas)
- [ ] Implementar memória de longo prazo (embeddings)
- [ ] Adicionar aprendizado de preferências
- [ ] Implementar agentes colaborativos
- [ ] Adicionar scheduling de tarefas
- [ ] Implementar notificações
- [ ] Criar marketplace de agentes
- [ ] Testar com tarefas complexas

## 💡 Exemplos de Uso

### 1. Edição Direta
```
Você: "Adicione uma seção sobre AWS Bedrock no documento 'Setup Guide'"
AI: [Edita o documento diretamente]
    ✅ Adicionado seção "AWS Bedrock Setup" com 3 parágrafos
    📄 Ver mudanças | ↩️ Desfazer
```

### 2. Criação de Database
```
Você: "Crie uma tabela de tarefas com colunas: Nome, Status, Prioridade, Responsável"
AI: [Cria database]
    ✅ Database "Tarefas" criada com 4 colunas
    🔗 Abrir database
```

### 3. View Cross-Page
```
Você: "Mostre as tarefas de alta prioridade do projeto X nesta página"
AI: [Cria view filtrada]
    ✅ View criada mostrando 5 tarefas de alta prioridade
    🔗 Ver database original
```

### 4. Delegação para Agente
```
Você: @ResearchAgent "Pesquise sobre embeddings multimodais e crie um resumo"
Agent: [Trabalha em background]
    🔄 Pesquisando fontes...
    📝 Criando resumo...
    ✅ Resumo criado em "Multimodal Embeddings Research"
    📊 3 fontes consultadas, 2 páginas criadas
```

## 🔧 Ferramentas Necessárias

### Backend
- ✅ Copilot tools system (já existe)
- ✅ GraphQL API (já existe)
- ❌ Agent management system
- ❌ Task execution engine
- ❌ Memory system com embeddings

### Frontend
- ✅ Chat interface (já existe)
- ⚠️ Document editor integration (melhorar)
- ❌ Agent creation UI
- ❌ Task delegation UI
- ❌ Execution monitoring UI

### Infraestrutura
- ✅ PostgreSQL (já existe)
- ✅ Redis (já existe)
- ✅ LiteLLM (já existe)
- ❌ Job queue para tarefas longas
- ❌ WebSocket para updates em tempo real

## 📊 Estimativa de Esforço

| Funcionalidade | Complexidade | Tempo Estimado | Prioridade |
|----------------|--------------|----------------|------------|
| Edição Direta | Baixa | 1-2 semanas | Alta |
| Inserção de Databases | Média | 2-3 semanas | Média |
| Referências Cross-Page | Média | 2-3 semanas | Média |
| Agentes Básicos | Alta | 4-6 semanas | Baixa |
| Agentes Avançados | Muito Alta | 6-8 semanas | Baixa |

**Total**: 15-22 semanas (~4-5 meses) para implementação completa

## 🎯 Recomendação

**Começar por**: Edição Direta + Inserção de Databases

**Motivo**:
1. Menor complexidade
2. Maior impacto imediato
3. Base para funcionalidades mais avançadas
4. Não requer mudanças arquiteturais grandes

**Próximos passos**:
1. Melhorar tool `docEdit` existente
2. Criar tool `createDatabase`
3. Testar com usuários
4. Iterar baseado em feedback
5. Depois considerar agentes autônomos

---

**Quer que eu comece implementando alguma dessas funcionalidades?**
