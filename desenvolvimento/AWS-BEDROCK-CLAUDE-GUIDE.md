# Guia: Usar Claude (Anthropic) via AWS Bedrock no AFFiNE

## 🎯 Visão Geral

Existem **3 formas** de usar Claude da Anthropic via AWS Bedrock no AFFiNE:

1. **Via LiteLLM Proxy** (Mais Simples) ⭐ Recomendado
2. **Via Anthropic Vertex Provider** (Já existe no código)
3. **Criar Provedor Bedrock Customizado** (Mais trabalho)

---

## 🚀 Opção 1: LiteLLM Proxy (Recomendado)

### Por que usar LiteLLM?
- ✅ Sem modificar código do AFFiNE
- ✅ Suporta 100+ provedores (Bedrock, Azure, Vertex, etc)
- ✅ Gerenciamento de custos e rate limiting
- ✅ Fallback automático entre modelos
- ✅ Cache de respostas

### Passo 1: Instalar LiteLLM

```bash
pip install litellm[proxy]
```

### Passo 2: Criar arquivo de configuração

Crie `litellm_config.yaml`:

```yaml
model_list:
  # Claude 3.5 Sonnet via Bedrock
  - model_name: claude-3-5-sonnet
    litellm_params:
      model: bedrock/anthropic.claude-3-5-sonnet-20240620-v1:0
      aws_region_name: us-east-1
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY

  # Claude 3 Opus via Bedrock
  - model_name: claude-3-opus
    litellm_params:
      model: bedrock/anthropic.claude-3-opus-20240229-v1:0
      aws_region_name: us-east-1
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY

  # Claude 3 Haiku via Bedrock
  - model_name: claude-3-haiku
    litellm_params:
      model: bedrock/anthropic.claude-3-haiku-20240307-v1:0
      aws_region_name: us-east-1
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY

  # Claude Instant via Bedrock
  - model_name: claude-instant
    litellm_params:
      model: bedrock/anthropic.claude-instant-v1
      aws_region_name: us-east-1
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY

# Configurações gerais
general_settings:
  master_key: sk-1234  # Chave para autenticar no proxy
  
litellm_settings:
  drop_params: true  # Remove parâmetros não suportados
  success_callback: ["langfuse"]  # Opcional: logging
```

### Passo 3: Iniciar o proxy

```bash
# Definir credenciais AWS
export AWS_ACCESS_KEY_ID=sua_access_key
export AWS_SECRET_ACCESS_KEY=sua_secret_key
export AWS_REGION_NAME=us-east-1

# Iniciar proxy
litellm --config litellm_config.yaml --port 4000
```

Ou com Docker:

```bash
docker run -d \
  -p 4000:4000 \
  -e AWS_ACCESS_KEY_ID=sua_access_key \
  -e AWS_SECRET_ACCESS_KEY=sua_secret_key \
  -e AWS_REGION_NAME=us-east-1 \
  -v $(pwd)/litellm_config.yaml:/app/config.yaml \
  ghcr.io/berriai/litellm:main-latest \
  --config /app/config.yaml --port 4000
```

### Passo 4: Configurar AFFiNE

No arquivo `.env` do AFFiNE:

```env
# Usar LiteLLM como provedor OpenAI
COPILOT_OPENAI_BASE_URL=http://localhost:4000
COPILOT_OPENAI_API_KEY=sk-1234

# Desabilitar outros provedores se não for usar
# COPILOT_ANTHROPIC_API_KEY=
```

### Passo 5: Testar

O AFFiNE agora vai usar os modelos Claude via Bedrock automaticamente!

Os modelos aparecerão como:
- `claude-3-5-sonnet`
- `claude-3-opus`
- `claude-3-haiku`
- `claude-instant`

---

## 🔧 Opção 2: Usar Anthropic Vertex Provider (Já existe!)

O AFFiNE já tem suporte para Anthropic via Google Vertex AI. Você pode adaptar para Bedrock.

### Verificar o código existente:

```bash
# Ver implementação atual
cat packages/backend/server/src/plugins/copilot/providers/anthropic/vertex.ts
```

### Configuração via Admin ou Banco de Dados

O AFFiNE permite configurar provedores via interface admin. Você precisaria:

1. Acessar a interface admin
2. Configurar o provedor Anthropic Vertex
3. Adaptar as credenciais para Bedrock

**Nota:** Esta opção requer mais investigação do código existente.

---

## 💻 Opção 3: Criar Provedor Bedrock Customizado

### Passo 1: Instalar dependências

```bash
cd packages/backend/server
yarn add @ai-sdk/amazon-bedrock
```

### Passo 2: Criar o provedor

Crie `packages/backend/server/src/plugins/copilot/providers/bedrock.ts`:

```typescript
import { bedrock } from '@ai-sdk/amazon-bedrock';
import {
  AISDKError,
  embedMany,
  generateText,
  streamText,
  Tool,
} from 'ai';
import { z } from 'zod';

import {
  CopilotProviderSideError,
  metrics,
  UserFriendlyError,
} from '../../../base';
import { CopilotProvider } from './provider';
import type {
  CopilotChatOptions,
  CopilotEmbeddingOptions,
  CopilotProviderModel,
  ModelConditions,
  PromptMessage,
} from './types';
import {
  CopilotProviderType,
  ModelInputType,
  ModelOutputType,
} from './types';
import {
  chatToGPTMessage,
  CitationParser,
  TextStreamParser,
} from './utils';

export type BedrockConfig = {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export class BedrockProvider extends CopilotProvider<BedrockConfig> {
  readonly type = CopilotProviderType.Bedrock;

  readonly models = [
    // Claude 3.5 Sonnet
    {
      name: 'Claude 3.5 Sonnet',
      id: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
          defaultForOutputType: true,
        },
      ],
    },
    // Claude 3 Opus
    {
      name: 'Claude 3 Opus',
      id: 'anthropic.claude-3-opus-20240229-v1:0',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Claude 3 Sonnet
    {
      name: 'Claude 3 Sonnet',
      id: 'anthropic.claude-3-sonnet-20240229-v1:0',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Claude 3 Haiku
    {
      name: 'Claude 3 Haiku',
      id: 'anthropic.claude-3-haiku-20240307-v1:0',
      capabilities: [
        {
          input: [ModelInputType.Text, ModelInputType.Image],
          output: [ModelOutputType.Text, ModelOutputType.Object],
        },
      ],
    },
    // Claude Instant
    {
      name: 'Claude Instant',
      id: 'anthropic.claude-instant-v1',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Text],
        },
      ],
    },
    // Titan Embeddings
    {
      name: 'Titan Embeddings',
      id: 'amazon.titan-embed-text-v1',
      capabilities: [
        {
          input: [ModelInputType.Text],
          output: [ModelOutputType.Embedding],
          defaultForOutputType: true,
        },
      ],
    },
  ];

  #instance!: ReturnType<typeof bedrock>;

  override configured(): boolean {
    return !!(
      this.config.accessKeyId &&
      this.config.secretAccessKey &&
      this.config.region
    );
  }

  protected override setup() {
    super.setup();
    this.#instance = bedrock({
      region: this.config.region || 'us-east-1',
      accessKeyId: this.config.accessKeyId,
      secretAccessKey: this.config.secretAccessKey,
    });
  }

  private handleError(e: any, model: string, options: CopilotChatOptions = {}) {
    if (e instanceof UserFriendlyError) {
      return e;
    } else if (e instanceof AISDKError) {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: e.name || 'unknown',
        message: e.message,
      });
    } else {
      return new CopilotProviderSideError({
        provider: this.type,
        kind: 'unexpected_response',
        message: e?.message || 'Unexpected Bedrock response',
      });
    }
  }

  async text(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): Promise<string> {
    const fullCond = { ...cond, outputType: ModelOutputType.Text };
    await this.checkParams({ messages, cond: fullCond, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai.counter('chat_text_calls').add(1, { model: model.id });

      const [system, msgs] = await chatToGPTMessage(messages);
      const modelInstance = this.#instance(model.id);

      const { text } = await generateText({
        model: modelInstance,
        system,
        messages: msgs,
        temperature: options.temperature ?? 0,
        maxTokens: options.maxTokens ?? 4096,
        abortSignal: options.signal,
      });

      return text.trim();
    } catch (e: any) {
      metrics.ai.counter('chat_text_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  async *streamText(
    cond: ModelConditions,
    messages: PromptMessage[],
    options: CopilotChatOptions = {}
  ): AsyncIterable<string> {
    const fullCond = { ...cond, outputType: ModelOutputType.Text };
    await this.checkParams({ messages, cond: fullCond, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai.counter('chat_text_stream_calls').add(1, { model: model.id });

      const [system, msgs] = await chatToGPTMessage(messages);
      const modelInstance = this.#instance(model.id);

      const { fullStream } = streamText({
        model: modelInstance,
        system,
        messages: msgs,
        temperature: options.temperature ?? 0,
        maxTokens: options.maxTokens ?? 4096,
        abortSignal: options.signal,
      });

      const citationParser = new CitationParser();
      const textParser = new TextStreamParser();

      for await (const chunk of fullStream) {
        switch (chunk.type) {
          case 'text-delta': {
            let result = textParser.parse(chunk);
            result = citationParser.parse(result);
            yield result;
            break;
          }
          case 'finish': {
            const footnotes = textParser.end();
            const result =
              citationParser.end() + (footnotes.length ? '\n' + footnotes : '');
            yield result;
            break;
          }
          default: {
            yield textParser.parse(chunk);
            break;
          }
        }
        if (options.signal?.aborted) {
          await fullStream.cancel();
          break;
        }
      }
    } catch (e: any) {
      metrics.ai.counter('chat_text_stream_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }

  override async embedding(
    cond: ModelConditions,
    messages: string | string[],
    options: CopilotEmbeddingOptions = { dimensions: 1024 }
  ): Promise<number[][]> {
    messages = Array.isArray(messages) ? messages : [messages];
    const fullCond = { ...cond, outputType: ModelOutputType.Embedding };
    await this.checkParams({ embeddings: messages, cond: fullCond, options });
    const model = this.selectModel(fullCond);

    try {
      metrics.ai.counter('generate_embedding_calls').add(1, { model: model.id });

      const modelInstance = this.#instance.textEmbeddingModel(model.id);

      const { embeddings } = await embedMany({
        model: modelInstance,
        values: messages,
      });

      return embeddings.filter(v => v && Array.isArray(v));
    } catch (e: any) {
      metrics.ai.counter('generate_embedding_errors').add(1, { model: model.id });
      throw this.handleError(e, model.id, options);
    }
  }
}
```

### Passo 3: Adicionar ao enum de tipos

Edite `packages/backend/server/src/plugins/copilot/providers/types.ts`:

```typescript
export enum CopilotProviderType {
  OpenAI = 'openai',
  FAL = 'fal',
  Gemini = 'gemini',
  GeminiVertex = 'gemini-vertex',
  Perplexity = 'perplexity',
  Anthropic = 'anthropic',
  AnthropicVertex = 'anthropic-vertex',
  Morph = 'morph',
  Bedrock = 'bedrock',  // ← Adicionar
}
```

### Passo 4: Registrar no módulo

Edite `packages/backend/server/src/plugins/copilot/index.ts`:

```typescript
import { BedrockProvider } from './providers/bedrock';

// No método onModuleInit ou similar:
if (this.config.providers.bedrock.apiKey) {
  const bedrock = new BedrockProvider(
    this.config.providers.bedrock,
    this.factory
  );
  this.factory.register(bedrock);
}
```

### Passo 5: Adicionar configuração

Edite `packages/backend/server/src/plugins/copilot/config.ts`:

```typescript
import type { BedrockConfig } from './providers/bedrock';

declare global {
  interface AppConfigSchema {
    copilot: {
      // ... outros
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

### Passo 6: Configurar no .env

```env
COPILOT_BEDROCK_REGION=us-east-1
COPILOT_BEDROCK_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
COPILOT_BEDROCK_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Passo 7: Rebuild e testar

```bash
yarn workspace @affine/server build
yarn workspace @affine/server dev
```

---

## 📊 Comparação das Opções

| Aspecto | LiteLLM Proxy | Vertex Provider | Bedrock Customizado |
|---------|---------------|-----------------|---------------------|
| Complexidade | ⭐ Baixa | ⭐⭐ Média | ⭐⭐⭐ Alta |
| Modificar código | ❌ Não | ⚠️ Talvez | ✅ Sim |
| Flexibilidade | ⭐⭐⭐ Alta | ⭐⭐ Média | ⭐⭐⭐ Alta |
| Manutenção | ⭐⭐⭐ Fácil | ⭐⭐ Média | ⭐ Difícil |
| Performance | ⭐⭐ Boa | ⭐⭐⭐ Ótima | ⭐⭐⭐ Ótima |
| Suporte multi-provider | ✅ Sim | ❌ Não | ❌ Não |

---

## 🎯 Recomendação

**Use LiteLLM Proxy (Opção 1)** porque:

1. ✅ Não precisa modificar código do AFFiNE
2. ✅ Setup em 5 minutos
3. ✅ Suporta fallback entre modelos
4. ✅ Gerenciamento de custos built-in
5. ✅ Pode adicionar outros provedores facilmente
6. ✅ Logging e monitoring integrados

---

## 🔐 Segurança

### Melhores Práticas:

1. **Use IAM Roles** em vez de access keys quando possível
2. **Limite permissões** apenas para Bedrock:
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
      "Resource": "arn:aws:bedrock:*:*:model/*"
    }
  ]
}
```
3. **Use AWS Secrets Manager** para credenciais
4. **Habilite CloudTrail** para auditoria

---

## 💰 Custos Estimados (AWS Bedrock)

### Claude 3.5 Sonnet
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens

### Claude 3 Haiku
- Input: $0.25 / 1M tokens
- Output: $1.25 / 1M tokens

### Titan Embeddings
- $0.10 / 1M tokens

**Dica:** Use LiteLLM para configurar rate limiting e evitar custos inesperados!

---

## 🐛 Troubleshooting

### Erro: "Model not found"
- Verifique se o modelo está disponível na sua região AWS
- Alguns modelos requerem aprovação prévia no console AWS

### Erro: "Access Denied"
- Verifique as permissões IAM
- Confirme que as credenciais estão corretas

### Erro: "Rate limit exceeded"
- Configure rate limiting no LiteLLM
- Considere usar múltiplas contas AWS para load balancing

---

## 📚 Recursos Adicionais

- [AWS Bedrock Docs](https://docs.aws.amazon.com/bedrock/)
- [LiteLLM Docs](https://docs.litellm.ai/)
- [Vercel AI SDK - Bedrock](https://sdk.vercel.ai/providers/ai-sdk-providers/amazon-bedrock)
- [Claude via Bedrock](https://docs.anthropic.com/en/api/claude-on-amazon-bedrock)
