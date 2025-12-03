# Fluxo de Deploy - AFFiNE Self-Hosted

## 🎯 Visão Geral

Este documento explica o fluxo completo de build e deploy do AFFiNE self-hosted, baseado no código oficial.

## 📦 Estrutura de Build

### Frontend (3 aplicações)

1. **Web** (`@affine/web`)
   - Aplicação principal do usuário
   - Build: `yarn workspace @affine/web build`
   - Output: `packages/frontend/apps/web/dist/`
   - Deploy: Copiar para `packages/backend/server/static/`

2. **Admin** (`@affine/admin`)
   - Painel administrativo
   - Build: `yarn workspace @affine/admin build`
   - Output: `packages/frontend/apps/admin/dist/`
   - Deploy: Copiar para `packages/backend/server/static/admin/`

3. **Mobile** (`@affine/mobile`)
   - Interface mobile (opcional)
   - Build: `yarn workspace @affine/mobile build`
   - Output: `packages/frontend/apps/mobile/dist/`
   - Deploy: Copiar para `packages/backend/server/static/mobile/`

### Backend

**Server** (`@affine/server`)
- API GraphQL, autenticação, storage, etc
- Build: `yarn workspace @affine/server build`
- Output: `packages/backend/server/dist/`

## 🔄 Fluxo Oficial (Docker)

Baseado em `.github/deployment/node/Dockerfile`:

```dockerfile
# 1. Build do frontend (em jobs separados no CI)
yarn workspace @affine/web build
yarn workspace @affine/admin build
yarn workspace @affine/mobile build

# 2. Build do backend
yarn workspace @affine/server build

# 3. Copiar arquivos estáticos
COPY ./packages/frontend/apps/web/dist /app/static
COPY ./packages/frontend/admin/dist /app/static/admin
COPY ./packages/frontend/apps/mobile/dist /app/static/mobile

# 4. Preparar banco de dados
node scripts/self-host-predeploy.js
```

## 🛠️ Script `self-host-predeploy.js`

Localização: `packages/backend/server/scripts/self-host-predeploy.js`

### O que faz:

1. **Cria configuração inicial**
   ```javascript
   // Cria ~/.affine/config/private.key
   // Chave EC prime256v1 para JWT
   ```

2. **Corrige migrations falhadas**
   ```javascript
   // Lista de migrations conhecidas que podem falhar
   // Tenta fazer rollback se necessário
   ```

3. **Aplica migrations**
   ```bash
   yarn prisma migrate deploy
   ```

4. **Roda data migrations**
   ```bash
   yarn cli run
   ```

### Quando usar:

- ✅ Primeira vez rodando o servidor
- ✅ Após atualizar versão (novas migrations)
- ✅ Após limpar banco de dados
- ❌ Não precisa rodar toda vez em desenvolvimento

## 📝 Fluxo Completo para Self-Hosted

### Setup Inicial (Uma Vez)

```powershell
# 1. Instalar dependências
yarn install

# 2. Iniciar containers
cd .docker/dev
docker compose up -d
cd ../..

# 3. Build completo
.\scripts\build-for-selfhost.ps1

# 4. Preparar banco de dados
node packages/backend/server/scripts/self-host-predeploy.js

# 5. Iniciar servidor
yarn workspace @affine/server dev
```

### Desenvolvimento Diário

```powershell
# 1. Containers (se não estiverem rodando)
cd .docker/dev && docker compose up -d && cd ../..

# 2. Servidor
yarn workspace @affine/server dev

# 3. (Opcional) Frontend com hot reload
yarn dev  # Porta 3000
```

### Após Mudanças no Código

**Frontend:**
```powershell
# Rebuild e copiar
.\scripts\build-for-selfhost.ps1

# Reiniciar servidor (Ctrl+C e rodar novamente)
yarn workspace @affine/server dev
```

**Backend:**
```powershell
# Apenas rebuild
yarn workspace @affine/server build

# Reiniciar servidor
yarn workspace @affine/server dev
```

**Banco de Dados (Schema):**
```powershell
# Criar migration
yarn workspace @affine/server prisma migrate dev --name nome_da_migration

# Aplicar em produção
yarn workspace @affine/server prisma migrate deploy
```

## 🎯 Diferenças: Desenvolvimento vs Produção

### Desenvolvimento

**Frontend:**
- Vite dev server (porta 3000)
- Hot reload
- Source maps
- Não precisa build

**Backend:**
- Nodemon (auto-restart)
- TypeScript direto (ts-node)
- Debug habilitado

**Acesso:**
- Frontend dev: http://localhost:3000
- Backend: http://localhost:3010 (serve frontend buildado)

### Produção (Self-Hosted)

**Frontend:**
- Arquivos estáticos buildados
- Minificado e otimizado
- Servido pelo backend

**Backend:**
- Node.js (código compilado)
- Sem auto-restart
- Logs estruturados

**Acesso:**
- Tudo via backend: http://localhost:3010

## 📂 Estrutura de Diretórios

```
AFFiNE/
├── packages/
│   ├── frontend/
│   │   └── apps/
│   │       ├── web/
│   │       │   └── dist/          # Build do web
│   │       ├── admin/
│   │       │   └── dist/          # Build do admin
│   │       └── mobile/
│   │           └── dist/          # Build do mobile
│   └── backend/
│       └── server/
│           ├── dist/              # Build do backend
│           ├── static/            # Arquivos estáticos (copiados)
│           │   ├── index.html     # Web (affine cloud)
│           │   ├── selfhost.html  # Web (self-hosted)
│           │   ├── admin/
│           │   │   ├── index.html
│           │   │   └── selfhost.html
│           │   └── mobile/
│           │       ├── index.html
│           │       └── selfhost.html
│           └── scripts/
│               └── self-host-predeploy.js
└── scripts/
    └── build-for-selfhost.ps1     # Script customizado
```

## 🔍 Como o Backend Serve os Arquivos

Código: `packages/backend/server/src/core/selfhost/static.ts`

```typescript
// Quando DEPLOYMENT_TYPE=selfhosted
app.get([basePath, basePath + '/*path'], (req, res) => {
  return res.sendFile(
    join(
      staticPath,
      mobile ? 'mobile' : '',
      env.selfhosted ? 'selfhost.html' : 'index.html'
    )
  );
});
```

**Lógica:**
- Se `DEPLOYMENT_TYPE=selfhosted` → serve `selfhost.html`
- Se `DEPLOYMENT_TYPE=affine` → serve `index.html`
- Mobile detectado via User-Agent → serve de `static/mobile/`
- Admin → serve de `static/admin/`

## 🚨 Problemas Comuns

### Erro: "ENOENT: selfhost.html"

**Causa:** Arquivos estáticos não foram copiados

**Solução:**
```powershell
.\scripts\build-for-selfhost.ps1
```

### Erro: "Migration failed"

**Causa:** Schema do banco desatualizado

**Solução:**
```powershell
node packages/backend/server/scripts/self-host-predeploy.js
```

### Frontend não carrega (tela branca)

**Causa:** Build incompleto ou arquivos não copiados

**Solução:**
```powershell
# Limpar e rebuildar
Remove-Item -Recurse -Force packages\backend\server\static
.\scripts\build-for-selfhost.ps1
```

## 📚 Referências

- Dockerfile oficial: `.github/deployment/node/Dockerfile`
- Script predeploy: `packages/backend/server/scripts/self-host-predeploy.js`
- Static resolver: `packages/backend/server/src/core/selfhost/static.ts`
- Workflow CI: `.github/workflows/build-images.yml`

## ✅ Checklist de Deploy

- [ ] Containers Docker rodando
- [ ] Frontend web buildado
- [ ] Frontend admin buildado
- [ ] Backend buildado
- [ ] Arquivos copiados para `static/`
- [ ] Banco de dados preparado (predeploy)
- [ ] Variáveis de ambiente configuradas
- [ ] LiteLLM configurado (se usar IA)
- [ ] Servidor iniciado
- [ ] Healthcheck OK (`/api/healthz`)
