# Como Usar IA no AFFiNE Self-Hosted

## 🎯 Problema Comum

Você vê a mensagem: **"You need to login to AFFiNE Cloud to continue using AFFiNE AI."**

## 📋 Pré-requisitos para Usar IA

Para usar a IA no AFFiNE self-hosted, você precisa de **3 coisas**:

### 1. ✅ Servidor Self-Hosted Rodando
- Backend configurado com `DEPLOYMENT_TYPE=selfhosted`
- LiteLLM rodando e configurado
- Copilot provider configurado (OpenAI, LiteLLM, etc)

### 2. ✅ Estar Logado no Servidor Self-Hosted
- Criar uma conta no seu servidor
- Fazer login com essa conta

### 3. ✅ Workspace Conectado ao Servidor (Cloud)
- O workspace **NÃO pode ser local**
- Precisa ser um workspace **cloud** (conectado ao seu servidor self-hosted)

## 🔍 Por que isso acontece?

### Fluxo de Autenticação da IA:

```
Usuário → Frontend → Backend (verifica auth) → Copilot Provider → LiteLLM → AWS Bedrock
```

Quando você usa um **workspace local**:
- ❌ Não há conexão com o servidor
- ❌ Não há autenticação
- ❌ Backend retorna erro 401 (Unauthorized)
- ❌ Frontend mostra: "You need to login to AFFiNE Cloud"

Quando você usa um **workspace cloud** (conectado ao self-hosted):
- ✅ Conectado ao seu servidor
- ✅ Autenticado via token
- ✅ Backend valida e processa
- ✅ IA funciona!

## 🚀 Como Resolver

### Opção 1: Criar Conta e Workspace Cloud (Recomendado)

#### Passo 1: Iniciar o Servidor

```bash
# Iniciar containers Docker
cd .docker/dev
docker compose up -d

# Build do frontend (IMPORTANTE - primeira vez)
cd ../..
yarn workspace @affine/web build

# Iniciar backend AFFiNE
yarn workspace @affine/server dev
```

#### Passo 2: Criar uma Conta

**Opção A - Criar nova conta:**
1. Abra o navegador em `http://localhost:3010`
2. Clique em **"Get Started"** ou **"Sign Up"**
3. Preencha:
   - Email: `seu@email.com`
   - Senha: `suasenha123` (mínimo 8 caracteres)
4. Confirme o email (se necessário, verifique o Mailpit em `http://localhost:8025`)

**Opção B - Usar usuário de desenvolvimento:**
- Email: `dev@affine.pro` / Senha: `dev` (Free Plan)
- Email: `pro@affine.pro` / Senha: `pro` (Pro Plan)
- Email: `team@affine.pro` / Senha: `team` (Team Plan)

#### Passo 3: Criar um Workspace Cloud

1. Após login, clique em **"New Workspace"**
2. Dê um nome ao workspace
3. **IMPORTANTE:** O workspace será automaticamente criado como **cloud** (conectado ao servidor)

#### Passo 4: Testar a IA

1. Abra um documento
2. Selecione algum texto
3. Clique no botão de IA ou use o atalho
4. A IA deve funcionar! ✅

### Opção 2: Converter Workspace Local para Cloud

Se você já tem um workspace local com dados:

#### Passo 1: Fazer Login

1. Faça login no servidor self-hosted
2. Vá para a lista de workspaces

#### Passo 2: Habilitar Cloud no Workspace

1. Encontre seu workspace local
2. Clique em **"Enable Cloud"** ou **"Sync to Cloud"**
3. O workspace será migrado para o servidor

#### Passo 3: Testar a IA

Agora a IA deve funcionar!

## 🔧 Verificar Configuração

### 1. Verificar se o Servidor Está Rodando

```bash
# Verificar backend
curl http://localhost:3010/api/healthz

# Verificar LiteLLM
curl http://localhost:4000/health
```

### 2. Verificar Features Habilitadas

```bash
# GraphQL query para ver features
curl -X POST http://localhost:3010/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ serverConfig { features } }"
  }'
```

Deve retornar algo como:
```json
{
  "data": {
    "serverConfig": {
      "features": ["copilot", "copilotEmbedding", "indexer", ...]
    }
  }
}
```

### 3. Verificar se Está Logado

No console do navegador (F12):
```javascript
// Verificar se há token de autenticação
localStorage.getItem('affine:token')
// Deve retornar um token JWT
```

### 4. Verificar Tipo do Workspace

No console do navegador:
```javascript
// Verificar flavour do workspace
// local = workspace local (sem servidor)
// cloud = workspace conectado ao servidor
```

## 🐛 Troubleshooting

### Erro: "You need to login to AFFiNE Cloud"

**Causa:** Workspace é local OU você não está logado

**Solução:**
1. Verifique se está logado
2. Verifique se o workspace é cloud (não local)
3. Se for local, habilite cloud no workspace

### Erro: "Copilot is not available"

**Causa:** Backend não tem provider de IA configurado

**Solução:**
1. Verifique `.env` do backend:
   ```env
   COPILOT_OPENAI_BASE_URL=http://localhost:4000
   COPILOT_OPENAI_API_KEY=sk-affine-dev-key
   ```
2. Verifique se LiteLLM está rodando:
   ```bash
   docker compose ps litellm
   ```
3. Reinicie o backend

### Erro: "Payment Required" ou "Quota Exceeded"

**Causa:** Limites de quota atingidos

**Solução (Self-Hosted):**
1. Verifique se `DEPLOYMENT_TYPE=selfhosted` está configurado
2. Em self-hosted, quotas devem ser ilimitadas por padrão
3. Se necessário, adicione feature `unlimited_copilot` ao usuário:
   ```sql
   INSERT INTO user_features (user_id, feature_id, reason)
   VALUES ('user-id-aqui', 'unlimited_copilot', 'selfhosted');
   ```

## 📊 Diferenças: Local vs Cloud Workspace

| Aspecto | Local Workspace | Cloud Workspace |
|---------|----------------|-----------------|
| Armazenamento | Navegador (IndexedDB) | Servidor + Sync |
| Autenticação | ❌ Não requer | ✅ Requer login |
| IA (Copilot) | ❌ Não funciona | ✅ Funciona |
| Colaboração | ❌ Não suporta | ✅ Suporta |
| Sync entre dispositivos | ❌ Não | ✅ Sim |
| Backup | Manual | Automático |

## 🎯 Recomendação

Para usar IA no self-hosted:

1. ✅ **Sempre use workspaces cloud** (conectados ao servidor)
2. ✅ **Faça login** no servidor self-hosted
3. ✅ **Configure o backend** com provider de IA (LiteLLM)

Workspaces locais são úteis para:
- Testes offline
- Dados que não precisam de servidor
- Situações sem acesso à rede

Mas **não suportam IA** porque não há autenticação/servidor.

## 📚 Arquitetura

### Workspace Local (Sem IA):
```
Frontend → IndexedDB (local)
```

### Workspace Cloud (Com IA):
```
Frontend → Backend (auth) → Copilot → LiteLLM → AWS Bedrock
   ↓
PostgreSQL (dados)
```

## ✅ Checklist

- [ ] Servidor backend rodando
- [ ] LiteLLM rodando
- [ ] Conta criada no servidor
- [ ] Logado no servidor
- [ ] Workspace é do tipo **cloud** (não local)
- [ ] Feature `copilot` habilitada no servidor
- [ ] Provider de IA configurado (OpenAI/LiteLLM)

Se todos os itens estiverem ✅, a IA deve funcionar!

## 🎉 Conclusão

A mensagem "You need to login to AFFiNE Cloud" aparece porque:

1. O workspace é **local** (não conectado ao servidor), OU
2. Você não está **logado** no servidor

**Solução:** Use um workspace **cloud** e faça **login** no seu servidor self-hosted.

O termo "AFFiNE Cloud" na mensagem é genérico - no seu caso, refere-se ao **seu servidor self-hosted**, não ao cloud oficial da AFFiNE.
