# Exemplo: Controle de IA por Workspace

## 🎯 Objetivo

Permitir que cada workspace tenha:
- ✅ Sua própria chave de API (virtual key do LiteLLM)
- ✅ Limite de budget mensal
- ✅ Modelos específicos permitidos
- ✅ Tracking de uso individual

## 📊 Arquitetura

```
┌─────────────┐
│   AFFiNE    │
│   Frontend  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      AFFiNE Backend Server          │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Copilot Service             │  │
│  │  - Pega workspace_id         │  │
│  │  - Busca litellm_key do DB   │  │
│  │  - Faz request com a chave   │  │
│  └──────────────────────────────┘  │
└──────────┬──────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │   LiteLLM    │
    │   Proxy      │
    │              │
    │  - Valida    │
    │  - Rate      │
    │    limit     │
    │  - Budget    │
    │  - Logs      │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ AWS Bedrock  │
    │   Claude     │
    └──────────────┘
```

## 🗄️ Schema do Banco de Dados

### Opção 1: Adicionar à tabela existente

```prisma
// Em packages/backend/server/prisma/schema.prisma

model Workspace {
  id        String   @id @default(uuid())
  // ... campos existentes
  
  // Adicionar:
  litellmKey        String?  // Virtual key do LiteLLM
  litellmKeyCreated DateTime?
  litellmMaxBudget  Float?   @default(100) // Budget mensal em USD
  litellmModels     String[] // Modelos permitidos
  
  @@index([litellmKey])
}
```

### Opção 2: Criar tabela separada

```prisma
model WorkspaceAIConfig {
  id              String   @id @default(uuid())
  workspaceId     String   @unique
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  
  litellmKey      String   @unique
  litellmKeyId    String   // ID da key no LiteLLM
  maxBudget       Float    @default(100)
  budgetDuration  String   @default("30d")
  allowedModels   String[] @default(["claude-3-haiku"])
  
  enabled         Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([workspaceId])
  @@index([litellmKey])
}
```

## 💻 Implementação Backend

### 1. Service para gerenciar chaves

Criar `packages/backend/server/src/plugins/copilot/workspace-ai-key.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class WorkspaceAIKeyService {
  private readonly logger = new Logger(WorkspaceAIKeyService.name);
  private readonly litellmBaseUrl = 'http://localhost:4000';
  private readonly litellmMasterKey = process.env.LITELLM_MASTER_KEY;

  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Cria uma virtual key no LiteLLM para um workspace
   */
  async createKeyForWorkspace(
    workspaceId: string,
    options: {
      maxBudget?: number;
      budgetDuration?: string;
      models?: string[];
    } = {}
  ): Promise<string> {
    const {
      maxBudget = 100,
      budgetDuration = '30d',
      models = ['claude-3-haiku', 'claude-3-5-sonnet'],
    } = options;

    try {
      // Criar key no LiteLLM
      const response = await fetch(`${this.litellmBaseUrl}/key/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.litellmMasterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          models,
          max_budget: maxBudget,
          budget_duration: budgetDuration,
          metadata: {
            workspace_id: workspaceId,
            created_by: 'affine-server',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`LiteLLM API error: ${response.statusText}`);
      }

      const data = await response.json();
      const virtualKey = data.key;

      // Salvar no banco
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          litellmKey: virtualKey,
          litellmKeyCreated: new Date(),
          litellmMaxBudget: maxBudget,
          litellmModels: models,
        },
      });

      this.logger.log(`Created LiteLLM key for workspace ${workspaceId}`);
      return virtualKey;
    } catch (error) {
      this.logger.error(`Failed to create key for workspace ${workspaceId}`, error);
      throw error;
    }
  }

  /**
   * Busca a chave de um workspace (cria se não existir)
   */
  async getOrCreateKey(workspaceId: string): Promise<string> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { litellmKey: true },
    });

    if (workspace?.litellmKey) {
      return workspace.litellmKey;
    }

    // Criar nova chave
    return this.createKeyForWorkspace(workspaceId);
  }

  /**
   * Verifica o uso atual de um workspace
   */
  async getWorkspaceUsage(workspaceId: string): Promise<{
    spent: number;
    budget: number;
    remaining: number;
  }> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { litellmKey: true, litellmMaxBudget: true },
    });

    if (!workspace?.litellmKey) {
      return { spent: 0, budget: 0, remaining: 0 };
    }

    try {
      const response = await fetch(
        `${this.litellmBaseUrl}/key/info?key=${workspace.litellmKey}`,
        {
          headers: {
            'Authorization': `Bearer ${this.litellmMasterKey}`,
          },
        }
      );

      const data = await response.json();
      const spent = data.spend || 0;
      const budget = workspace.litellmMaxBudget || 0;

      return {
        spent,
        budget,
        remaining: Math.max(0, budget - spent),
      };
    } catch (error) {
      this.logger.error(`Failed to get usage for workspace ${workspaceId}`, error);
      return { spent: 0, budget: workspace.litellmMaxBudget || 0, remaining: 0 };
    }
  }

  /**
   * Revoga a chave de um workspace
   */
  async revokeKey(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { litellmKey: true },
    });

    if (!workspace?.litellmKey) {
      return;
    }

    try {
      await fetch(`${this.litellmBaseUrl}/key/delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.litellmMasterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys: [workspace.litellmKey],
        }),
      });

      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          litellmKey: null,
          litellmKeyCreated: null,
        },
      });

      this.logger.log(`Revoked LiteLLM key for workspace ${workspaceId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke key for workspace ${workspaceId}`, error);
      throw error;
    }
  }
}
```

### 2. Modificar o Copilot Provider

Editar `packages/backend/server/src/plugins/copilot/providers/openai.ts`:

```typescript
import { WorkspaceAIKeyService } from '../workspace-ai-key.service';

export class OpenAIProvider extends CopilotProvider<OpenAIConfig> {
  // ... código existente

  constructor(
    config: OpenAIConfig,
    factory: CopilotProviderFactory,
    private readonly workspaceAIKeyService?: WorkspaceAIKeyService // Injetar
  ) {
    super(config, factory);
  }

  // Modificar método para usar chave do workspace
  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions & { workspaceId?: string } = {}
  ): Promise<string> {
    // Pegar chave específica do workspace se disponível
    let apiKey = this.config.apiKey;
    
    if (options.workspaceId && this.workspaceAIKeyService) {
      try {
        apiKey = await this.workspaceAIKeyService.getOrCreateKey(options.workspaceId);
      } catch (error) {
        this.logger.warn(`Failed to get workspace key, using default`, error);
      }
    }

    // Usar apiKey específica na requisição
    const instance = createOpenAI({
      apiKey,
      baseURL: this.config.baseURL,
    });

    // ... resto do código
  }
}
```

### 3. Resolver GraphQL

Adicionar queries/mutations em `packages/backend/server/src/plugins/copilot/resolver.ts`:

```typescript
@Resolver(() => WorkspaceType)
export class CopilotResolver {
  // ... código existente

  @Query(() => WorkspaceAIUsage)
  async workspaceAIUsage(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    // Verificar permissão
    await this.permissions.checkWorkspace(workspaceId, user.id);

    return this.workspaceAIKeyService.getWorkspaceUsage(workspaceId);
  }

  @Mutation(() => Boolean)
  async createWorkspaceAIKey(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string,
    @Args('maxBudget', { nullable: true }) maxBudget?: number,
    @Args('models', { type: () => [String], nullable: true }) models?: string[]
  ) {
    // Verificar se é admin do workspace
    await this.permissions.checkWorkspaceOwner(workspaceId, user.id);

    await this.workspaceAIKeyService.createKeyForWorkspace(workspaceId, {
      maxBudget,
      models,
    });

    return true;
  }

  @Mutation(() => Boolean)
  async revokeWorkspaceAIKey(
    @CurrentUser() user: CurrentUser,
    @Args('workspaceId') workspaceId: string
  ) {
    await this.permissions.checkWorkspaceOwner(workspaceId, user.id);
    await this.workspaceAIKeyService.revokeKey(workspaceId);
    return true;
  }
}

// Types
@ObjectType()
class WorkspaceAIUsage {
  @Field(() => Float)
  spent: number;

  @Field(() => Float)
  budget: number;

  @Field(() => Float)
  remaining: number;
}
```

## 🎨 Frontend (Exemplo)

### Settings do Workspace

```typescript
// Em packages/frontend/core/src/components/workspace-settings/ai-settings.tsx

export const WorkspaceAISettings = ({ workspaceId }: { workspaceId: string }) => {
  const [usage, setUsage] = useState<WorkspaceAIUsage | null>(null);

  useEffect(() => {
    // Buscar uso atual
    fetchWorkspaceAIUsage(workspaceId).then(setUsage);
  }, [workspaceId]);

  return (
    <div>
      <h2>AI Usage</h2>
      {usage && (
        <div>
          <p>Spent: ${usage.spent.toFixed(2)}</p>
          <p>Budget: ${usage.budget.toFixed(2)}</p>
          <p>Remaining: ${usage.remaining.toFixed(2)}</p>
          
          <ProgressBar 
            value={usage.spent} 
            max={usage.budget} 
          />
        </div>
      )}

      <Button onClick={() => createWorkspaceAIKey(workspaceId)}>
        Create AI Key
      </Button>
      
      <Button onClick={() => revokeWorkspaceAIKey(workspaceId)}>
        Revoke AI Key
      </Button>
    </div>
  );
};
```

## 🔐 Controle de Acesso - Resumo

### Níveis de Controle

1. **Sem controle** (atual)
   - Todos usam a mesma chave master
   - Sem limites por workspace

2. **Por Workspace** (implementação acima)
   - Cada workspace tem sua chave
   - Budget e modelos específicos
   - Tracking individual

3. **Por Usuário** (avançado)
   - Cada usuário tem sua chave
   - Limites pessoais
   - Mais complexo de implementar

## 📊 Monitoramento

### Dashboard Admin

Criar uma página admin para ver uso de todos os workspaces:

```typescript
// Query para listar todos os workspaces com uso
const workspaces = await prisma.workspace.findMany({
  where: { litellmKey: { not: null } },
  select: {
    id: true,
    name: true,
    litellmKey: true,
    litellmMaxBudget: true,
  },
});

// Para cada workspace, buscar uso do LiteLLM
const usageData = await Promise.all(
  workspaces.map(async (ws) => ({
    ...ws,
    usage: await getWorkspaceUsage(ws.id),
  }))
);
```

## ✅ Checklist de Implementação

- [ ] Adicionar campos ao schema Prisma
- [ ] Rodar migration: `yarn workspace @affine/server prisma migrate dev`
- [ ] Criar `WorkspaceAIKeyService`
- [ ] Modificar `OpenAIProvider` para usar chave do workspace
- [ ] Adicionar resolvers GraphQL
- [ ] Criar UI de settings no frontend
- [ ] Testar criação de chave
- [ ] Testar uso com chave específica
- [ ] Implementar dashboard de monitoramento
- [ ] Adicionar alertas de budget

## 🎯 Resultado Final

Com essa implementação, você terá:

✅ **Controle granular** - Cada workspace com sua chave
✅ **Budget management** - Limites configuráveis
✅ **Tracking** - Uso individual por workspace
✅ **Flexibilidade** - Modelos específicos por workspace
✅ **Segurança** - Chaves isoladas e revogáveis
