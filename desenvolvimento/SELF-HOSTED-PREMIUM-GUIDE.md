# Guia: Features Premium Self-Hosted no AFFiNE

## 🎯 Resumo Executivo

**Boa notícia:** O AFFiNE já está configurado para usar features premium em self-hosted **SEM MODIFICAR CÓDIGO**!

Quando você configura `DEPLOYMENT_TYPE=selfhosted`, o sistema automaticamente usa o plano Pro como plano Free.

## 📊 Limites de Quotas Padrão

### Free Plan (Padrão)
```typescript
{
  name: 'Free',
  blobLimit: 10 MB,           // Limite por arquivo
  storageQuota: 10 GB,         // Armazenamento total
  historyPeriod: 7 dias,       // Histórico de versões
  memberLimit: 3,              // Membros por workspace
  copilotActionLimit: 10       // Ações de IA por mês
}
```

### Pro Plan
```typescript
{
  name: 'Pro',
  blobLimit: 100 MB,
  storageQuota: 100 GB,
  historyPeriod: 30 dias,
  memberLimit: 10,
  copilotActionLimit: 10
}
```

### Team Plan (Workspace)
```typescript
{
  name: 'Team Workspace',
  blobLimit: 500 MB,
  storageQuota: 100 GB,
  seatQuota: 20 GB,
  historyPeriod: 30 dias,
  memberLimit: 1              // Por padrão, mas pode ser customizado
}
```

## 🔧 Como Habilitar Features Premium

### Opção 1: Modo Self-Hosted (Recomendado)

Adicione no `.env`:

```env
DEPLOYMENT_TYPE=selfhosted
```

**Resultado:** Todos os usuários automaticamente recebem o plano Pro como padrão!

### Opção 2: Modificar Limites Diretamente no Código

Edite o arquivo: `packages/backend/server/src/models/common/feature.ts`

```typescript
// Exemplo: Aumentar limite de membros no Free Plan
free_plan_v1: {
  type: FeatureType.Quota,
  deprecatedVersion: 4,
  configs: {
    name: 'Free',
    blobLimit: 10 * OneMB,
    businessBlobLimit: 100 * OneMB,
    storageQuota: 10 * OneGB,
    historyPeriod: 7 * OneDay,
    memberLimit: 100,              // ← Altere aqui
    copilotActionLimit: 10,
  },
},
```

### Opção 3: Adicionar Features via Banco de Dados

Você pode adicionar features diretamente via SQL ou Prisma Studio:

```bash
# Abrir Prisma Studio
yarn workspace @affine/server prisma studio
```

Ou via código/seed:

```typescript
// Adicionar unlimited_workspace para um workspace específico
await models.workspaceFeature.add(
  workspaceId, 
  'unlimited_workspace', 
  'self-hosted unlimited'
);

// Adicionar unlimited_copilot para um usuário
await models.userFeature.add(
  userId, 
  'unlimited_copilot', 
  'self-hosted unlimited'
);
```

## 🤖 Configuração de IA (Copilot)

### Provedores Suportados Nativamente

1. **OpenAI** ✅
2. **Anthropic (Claude)** ✅
3. **Google Gemini** ✅
4. **Perplexity** ✅
5. **FAL** ✅

### AWS Bedrock - Requer Modificação

**Status:** ❌ Não suportado nativamente
**Solução:** Criar um novo provedor

#### Como Adicionar AWS Bedrock

1. Instalar o SDK:
```bash
yarn workspace @affine/server add @ai-sdk/amazon-bedrock
```

2. Criar o provedor: `packages/backend/server/src/plugins/copilot/providers/bedrock.ts`

```typescript
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateText, streamText } from 'ai';
import { CopilotProvider } from './provider';
import { CopilotProviderType, ModelInputType, ModelOutputType } from './types';

export type BedrockConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export class BedrockProvider extends CopilotProvider<BedrockConfig> {
  readonly type = CopilotProviderType.Bedrock; // Adicionar ao enum

  readonly models = [
    {
      name: 'Claude 3.5 Sonnet',
      id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Adicionar outros modelos...
  ];

  #instance!: ReturnType<typeof bedrock>;

  override configured(): boolean {
    return !!(this.config.accessKeyId && this.config.secretAccessKey);
  }

  protected override setup() {
    super.setup();
    this.#instance = bedrock({
      region: this.config.region || 'us-east-1',
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    });
  }

  async text(cond, messages, options = {}) {
    const model = this.selectModel(cond);
    const [system, msgs] = await chatToGPTMessage(messages);
    
    const { text } = await generateText({
      model: this.#instance(model.id),
      system,
      messages: msgs,
      temperature: options.temperature ?? 0,
      maxTokens: options.maxTokens ?? 4096,
    });

    return text.trim();
  }

  // Implementar outros métodos...
}
```

3. Registrar o provedor em `packages/backend/server/src/plugins/copilot/config.ts`:

```typescript
declare global {
  interface AppConfigSchema {
    copilot: {
      // ... outros provedores
      providers: {
        // ... outros
        bedrock: ConfigItem<BedrockConfig>;
      };
    };
  }
}

defineModuleConfig('copilot', {
  // ... outras configs
  'providers.bedrock': {
    desc: 'The config for AWS Bedrock provider.',
    default: {
      region: 'us-east-1',
      accessKeyId: '',
      secretAccessKey: '',
    },
  },
});
```

4. Adicionar no `.env`:

```env
COPILOT_BEDROCK_REGION=us-east-1
COPILOT_BEDROCK_ACCESS_KEY_ID=sua_chave
COPILOT_BEDROCK_SECRET_ACCESS_KEY=sua_secret
```

### Alternativa Mais Simples: Usar Proxy OpenAI-Compatible

Muitos provedores (incluindo Bedrock via LiteLLM) podem ser usados através de proxy compatível com OpenAI:

```env
# Usar LiteLLM como proxy para Bedrock
COPILOT_OPENAI_BASE_URL=http://localhost:4000/v1
COPILOT_OPENAI_API_KEY=sk-1234
```

## 🎁 Features Especiais

### Features Disponíveis

- `unlimited_workspace` - Workspace sem limites
- `unlimited_copilot` - IA sem limites de ações
- `ai_early_access` - Acesso antecipado a features de IA
- `administrator` - Permissões de admin

### Como Ativar

```typescript
// Via seed ou script
await models.userFeature.add(userId, 'unlimited_copilot', 'self-hosted');
await models.workspaceFeature.add(workspaceId, 'unlimited_workspace', 'self-hosted');
```

## 📝 Configuração Completa Recomendada

```env
# Ambiente
NODE_ENV=development
AFFINE_ENV=dev
DEPLOYMENT_TYPE=selfhosted  # ← IMPORTANTE: Habilita features premium

# Database
DATABASE_URL="postgresql://affine:affine@localhost:5432/affine"

# Redis
REDIS_SERVER_HOST=localhost
REDIS_SERVER_PORT=6379

# Email
MAILER_HOST=127.0.0.1
MAILER_PORT=1025
MAILER_SENDER="noreply@toeverything.info"

# IA - OpenAI
COPILOT_OPENAI_API_KEY=sua_chave
COPILOT_OPENAI_BASE_URL=https://api.openai.com/v1

# IA - Anthropic
COPILOT_ANTHROPIC_API_KEY=sua_chave

# IA - Google Gemini
COPILOT_GEMINI_API_KEY=sua_chave

# IA - Outros
COPILOT_PERPLEXITY_API_KEY=sua_chave
COPILOT_FAL_API_KEY=sua_chave
COPILOT_EXA_API_KEY=sua_chave
UNSPLASH_ACCESS_KEY=sua_chave
```

## ✅ Checklist de Implementação

- [ ] Configurar `DEPLOYMENT_TYPE=selfhosted` no `.env`
- [ ] Reiniciar o servidor
- [ ] Verificar que usuários têm plano Pro por padrão
- [ ] (Opcional) Modificar limites em `feature.ts`
- [ ] (Opcional) Adicionar features especiais via banco
- [ ] Configurar provedores de IA desejados
- [ ] (Se necessário) Implementar provedor customizado para Bedrock

## 🎯 Conclusão

**Você NÃO precisa modificar código para usar features premium em self-hosted!**

Apenas configure `DEPLOYMENT_TYPE=selfhosted` e todos os usuários terão acesso ao plano Pro automaticamente.

Para AWS Bedrock, você precisará criar um novo provedor (cerca de 200-300 linhas de código) ou usar um proxy compatível com OpenAI como LiteLLM.
