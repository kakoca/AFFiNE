# Embeddings AWS Bedrock - Guia Completo

## 🎯 Requisitos do AFFiNE

O AFFiNE tem requisitos específicos para embeddings:

```typescript
// packages/backend/server/src/models/common/copilot.ts
export const EMBEDDING_DIMENSIONS = 1024;
```

### Requisitos Obrigatórios

1. ✅ **Dimensões**: Exatamente **1024 dimensões**
2. ✅ **Tipo**: **Apenas texto** (não multimodal)
3. ✅ **Formato**: Vetor de números float

## 📊 Modelos AWS Bedrock Disponíveis

### ✅ Compatíveis com AFFiNE

#### 1. Amazon Titan Embed Text v2 (RECOMENDADO) ⭐

```yaml
model: bedrock/amazon.titan-embed-text-v2:0
```

**Especificações**:
- ✅ Dimensões: 1024
- ✅ Tipo: Texto apenas
- ✅ Input: Até 8,192 tokens
- ✅ Idiomas: Multilíngue (100+ idiomas)
- ✅ Custo: $0.0001 por 1K tokens

**Vantagens**:
- Versão mais recente
- Melhor performance
- Suporte a mais idiomas
- Maior limite de tokens

**Uso no AFFiNE**: ✅ Perfeito

#### 2. Amazon Titan Embed Text v1 (FALLBACK)

```yaml
model: bedrock/amazon.titan-embed-text-v1
```

**Especificações**:
- ✅ Dimensões: 1024
- ✅ Tipo: Texto apenas
- ✅ Input: Até 8,192 tokens
- ✅ Idiomas: Multilíngue

**Vantagens**:
- Estável e testado
- Compatível com v2

**Uso no AFFiNE**: ✅ Funciona (use como fallback)

#### 3. Cohere Embed English v3

```yaml
model: bedrock/cohere.embed-english-v3
```

**Especificações**:
- ✅ Dimensões: 1024
- ✅ Tipo: Texto apenas
- ⚠️ Idiomas: Apenas inglês

**Vantagens**:
- Alta qualidade
- Otimizado para inglês

**Desvantagens**:
- Não suporta português bem
- Mais caro que Titan

**Uso no AFFiNE**: ⚠️ Funciona, mas não recomendado (sem suporte a PT-BR)

#### 4. Cohere Embed Multilingual v3

```yaml
model: bedrock/cohere.embed-multilingual-v3
```

**Especificações**:
- ✅ Dimensões: 1024
- ✅ Tipo: Texto apenas
- ✅ Idiomas: Multilíngue (100+ idiomas)

**Vantagens**:
- Alta qualidade
- Suporte a português

**Desvantagens**:
- Mais caro que Titan

**Uso no AFFiNE**: ✅ Funciona (alternativa ao Titan)

### ❌ NÃO Compatíveis com AFFiNE

#### 1. Amazon Nova Multimodal Embeddings v1

```yaml
model: bedrock/amazon.nova-2-multimodal-embeddings-v1:0
```

**Especificações**:
- ✅ Dimensões: 1024 (compatível!)
- ❌ Tipo: Multimodal (texto + imagens)

**Por que não funciona**:
- AFFiNE espera embeddings de **texto apenas**
- AFFiNE não tem suporte a embeddings de imagens
- API diferente (requer input multimodal)

**Uso no AFFiNE**: ❌ Não compatível

**Futuro**: Pode ser suportado quando AFFiNE adicionar embeddings de imagens

#### 2. Amazon Titan Embed Image v1

```yaml
model: bedrock/amazon.titan-embed-image-v1
```

**Especificações**:
- ✅ Dimensões: 1024 (compatível!)
- ❌ Tipo: Imagens apenas

**Por que não funciona**:
- AFFiNE precisa de embeddings de **texto**
- Este modelo é apenas para imagens

**Uso no AFFiNE**: ❌ Não compatível

#### 3. Outros Modelos com Dimensões Diferentes

Qualquer modelo com dimensões diferentes de 1024:
- ❌ OpenAI text-embedding-3-small (1536 dimensões)
- ❌ OpenAI text-embedding-3-large (3072 dimensões)
- ❌ OpenAI text-embedding-ada-002 (1536 dimensões)

**Por que não funcionam**:
- AFFiNE usa pgvector com **1024 dimensões fixas**
- Não é possível alterar sem migração do banco de dados

## 🔧 Configuração Recomendada

### LiteLLM Config (.docker/dev/litellm_config.yaml)

```yaml
model_list:
  # Modelo principal (v2)
  - model_name: titan-embed-text
    litellm_params:
      model: bedrock/amazon.titan-embed-text-v2:0
      aws_region_name: os.environ/AWS_REGION_NAME
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY
    model_info:
      mode: embedding
      output_dimensions: 1024

  # Fallback (v1)
  - model_name: titan-embed-text-v1
    litellm_params:
      model: bedrock/amazon.titan-embed-text-v1
      aws_region_name: os.environ/AWS_REGION_NAME
      aws_access_key_id: os.environ/AWS_ACCESS_KEY_ID
      aws_secret_access_key: os.environ/AWS_SECRET_ACCESS_KEY
    model_info:
      mode: embedding
      output_dimensions: 1024

router_settings:
  fallbacks:
    - titan-embed-text: [titan-embed-text-v1]
```

### Admin Panel Config

```json
{
  "override_enabled": true,
  "scenarios": {
    "embedding": "titan-embed-text"
  }
}
```

## 💰 Comparação de Custos

| Modelo | Custo por 1K tokens | Custo por 1M tokens |
|--------|---------------------|---------------------|
| Titan Embed Text v2 | $0.0001 | $0.10 |
| Titan Embed Text v1 | $0.0001 | $0.10 |
| Cohere Embed English v3 | $0.0001 | $0.10 |
| Cohere Embed Multilingual v3 | $0.0001 | $0.10 |
| Nova Multimodal | $0.0008 | $0.80 |

**Recomendação**: Titan Embed Text v2 (melhor custo-benefício)

## 📊 Comparação de Performance

### Qualidade de Embeddings

| Modelo | Inglês | Português | Outros Idiomas | Performance |
|--------|--------|-----------|----------------|-------------|
| Titan v2 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Rápido |
| Titan v1 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Rápido |
| Cohere English | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | Médio |
| Cohere Multilingual | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Médio |

### Velocidade

| Modelo | Latência Média | Throughput |
|--------|----------------|------------|
| Titan v2 | ~50ms | Alto |
| Titan v1 | ~50ms | Alto |
| Cohere | ~100ms | Médio |

## 🧪 Como Testar

### Teste 1: Verificar Dimensões

```bash
# Testar via LiteLLM
curl -X POST http://localhost:4000/v1/embeddings \
  -H "Authorization: Bearer sk-affine-dev-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "titan-embed-text",
    "input": "Hello world"
  }'
```

**Resposta esperada**:
```json
{
  "data": [{
    "embedding": [0.123, 0.456, ...], // 1024 números
    "index": 0
  }]
}
```

### Teste 2: Verificar no AFFiNE

1. Habilitar embeddings no workspace
2. Criar documento de teste
3. Verificar logs:

```
[CopilotEmbeddingJob] Successfully embedded doc [doc-id]
[OpenAIProvider] Generated embedding with 1024 dimensions
```

## ⚠️ Troubleshooting

### Erro: Dimensões Incompatíveis

```
Error: Expected 1024 dimensions, got 1536
```

**Causa**: Modelo errado (ex: OpenAI ada-002)  
**Solução**: Usar Titan Embed Text v2

### Erro: Multimodal Not Supported

```
Error: Multimodal embeddings not supported
```

**Causa**: Tentando usar Nova Multimodal  
**Solução**: Usar Titan Embed Text v2

### Erro: Model Not Found

```
Error: Model titan-embed-text not found
```

**Causa**: LiteLLM não tem o modelo configurado  
**Solução**: Verificar litellm_config.yaml

## 🚀 Migração Futura

### Se AFFiNE Adicionar Suporte a Embeddings Multimodais

Quando o AFFiNE suportar embeddings de imagens:

```yaml
# Futuro: Nova Multimodal
- model_name: nova-multimodal-embed
  litellm_params:
    model: bedrock/amazon.nova-2-multimodal-embeddings-v1:0
  model_info:
    mode: embedding
    supports_multimodal: true
    output_dimensions: 1024
```

**Benefícios**:
- Busca por imagens
- Busca por texto + imagem
- Melhor contexto visual

### Se AFFiNE Mudar Dimensões

Se AFFiNE migrar para 1536 dimensões (OpenAI padrão):

```yaml
# Futuro: OpenAI Embeddings
- model_name: text-embedding-3-small
  litellm_params:
    model: openai/text-embedding-3-small
  model_info:
    mode: embedding
    output_dimensions: 1536
```

**Requer**:
- Migração do banco de dados
- Regeneração de todos os embeddings
- Atualização do pgvector

## 📚 Referências

- **AWS Bedrock Embeddings**: https://docs.aws.amazon.com/bedrock/latest/userguide/embeddings.html
- **Titan Embed Text v2**: https://docs.aws.amazon.com/bedrock/latest/userguide/titan-embedding-models.html
- **LiteLLM Embeddings**: https://docs.litellm.ai/docs/embedding/supported_embedding
- **AFFiNE Embeddings**: `packages/backend/server/src/models/common/copilot.ts`

## 💡 Recomendação Final

**Use**: Amazon Titan Embed Text v2 (`bedrock/amazon.titan-embed-text-v2:0`)

**Razões**:
1. ✅ Compatível com AFFiNE (1024 dimensões)
2. ✅ Suporte a português
3. ✅ Melhor custo-benefício
4. ✅ Versão mais recente
5. ✅ AWS nativo (mesma infraestrutura)
6. ✅ Rápido e eficiente

**Configuração**: Já atualizada no seu `litellm_config.yaml`! 🎉
