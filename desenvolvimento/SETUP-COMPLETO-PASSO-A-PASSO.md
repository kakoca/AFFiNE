# Setup Completo - Passo a Passo

## 🎯 Ordem Correta de Inicialização

### Passo 1: Iniciar Containers Docker

```bash
cd .docker/dev
docker compose up -d
```

Isso inicia:
- PostgreSQL (porta 5432)
- Redis (porta 6379)
- Mailpit (portas 1025 e 8025)
- LiteLLM (porta 4000)
- Manticore Search (porta 9308)

**Verificar:**
```bash
docker compose ps
# Todos devem estar "Up"
```

### Passo 2: Build Completo (IMPORTANTE!)

```bash
# Voltar para raiz do projeto
cd ../..

# Opção A: Usar script automatizado (Recomendado)
.\scripts\build-for-selfhost.ps1

# Opção B: Build manual
yarn workspace @affine/web build
yarn workspace @affine/admin build
yarn workspace @affine/server build
# Depois copiar manualmente os dist/* para packages/backend/server/static/
```

Isso:
1. Builda o frontend web
2. Builda o admin panel
3. Builda o backend
4. Copia os arquivos estáticos para `packages/backend/server/static/`

**Tempo estimado:** 5-10 minutos (primeira vez)

**Nota:** O script `build-for-selfhost.ps1` faz tudo automaticamente!

### Passo 3: Iniciar Backend

```bash
yarn workspace @affine/server dev
```

O backend vai:
- Conectar no PostgreSQL
- Rodar migrations
- Servir na porta 3010

**Verificar:**
```bash
curl http://localhost:3010/api/healthz
# Deve retornar: {"status":"ok"}
```

### Passo 4: Acessar a Interface

Abra o navegador em: **http://localhost:3010**

Você verá a interface do AFFiNE servida pelo backend!

## 🆕 Criar Conta de Usuário

### Opção 1: Via Interface Web (Recomendado)

1. Acesse **http://localhost:3010**
2. Clique em **"Get Started"** ou **"Sign Up"**
3. Preencha:
   - Email: `seu@email.com`
   - Senha: `suasenha123` (mínimo 8 caracteres)
4. Clique em **"Create Account"**

**Verificar email (se necessário):**
- Acesse **http://localhost:8025** (Mailpit)
- Veja o email de confirmação
- Clique no link

### Opção 2: Via Usuários de Desenvolvimento

O AFFiNE tem usuários pré-configurados para desenvolvimento:

**Usuário 1 - Free Plan:**
- Email: `dev@affine.pro`
- Senha: `dev`

**Usuário 2 - Pro Plan:**
- Email: `pro@affine.pro`
- Senha: `pro`

**Usuário 3 - Team Plan:**
- Email: `team@affine.pro`
- Senha: `team`

Esses usuários já têm features premium habilitadas!

### Opção 3: Via Prisma Studio (Avançado)

```bash
yarn workspace @affine/server prisma studio
```

Acesse **http://localhost:5555** e gerencie usuários diretamente no banco.

## 🚀 Modo Desenvolvimento (Hot Reload)

Se você quer desenvolver e ver mudanças em tempo real:

### Terminal 1: Backend
```bash
yarn workspace @affine/server dev
```

### Terminal 2: Frontend (Dev Mode)
```bash
yarn dev
```

Isso inicia o Vite dev server na porta **3000** com hot reload.

**Acesse:** http://localhost:3000

**Diferença:**
- `http://localhost:3010` - Backend servindo frontend buildado (produção)
- `http://localhost:3000` - Vite dev server (desenvolvimento, hot reload)

## 📊 Portas Usadas

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend (Vite Dev) | 3000 | http://localhost:3000 |
| Backend (AFFiNE Server) | 3010 | http://localhost:3010 |
| LiteLLM | 4000 | http://localhost:4000 |
| PostgreSQL | 5432 | - |
| Prisma Studio | 5555 | http://localhost:5555 |
| Redis | 6379 | - |
| Admin Panel | 8082 | http://localhost:8082 |
| Mailpit Web | 8025 | http://localhost:8025 |
| Mailpit SMTP | 1025 | - |
| Manticore Search | 9308 | - |

## 🔧 Comandos Úteis

### Preparar Banco de Dados (Primeira Vez)

Se for a primeira vez rodando o servidor, você pode precisar preparar o banco:

```bash
# Opção 1: Usar script oficial (recomendado)
node packages/backend/server/scripts/self-host-predeploy.js

# Opção 2: Manual
yarn workspace @affine/server prisma migrate deploy
yarn workspace @affine/server cli run
```

O script `self-host-predeploy.js` faz:
- Cria chave privada em `~/.affine/config/private.key`
- Corrige migrations que falharam
- Aplica migrations do Prisma
- Roda data migrations

### Ver Logs dos Containers
```bash
cd .docker/dev
docker compose logs -f
```

### Reiniciar um Container
```bash
docker compose restart litellm
```

### Parar Tudo
```bash
docker compose down
```

### Limpar Banco de Dados
```bash
docker compose down -v  # Remove volumes também
```

### Rebuild do Servidor (inclui frontend)
```bash
yarn workspace @affine/server build
```

### Ver Migrations do Banco
```bash
yarn workspace @affine/server prisma migrate status
```

### Aplicar Migrations
```bash
yarn workspace @affine/server prisma migrate deploy
```

## 🐛 Troubleshooting

### Erro: "ENOENT: no such file or directory, stat '...\static\selfhost.html'"

**Causa:** Servidor não foi buildado (faltam arquivos estáticos)

**Solução:**
```bash
# Build completo do servidor (inclui frontend)
yarn workspace @affine/server build

# Depois inicie o backend
yarn workspace @affine/server dev
```

### Erro: "Port 3010 already in use"

**Causa:** Backend já está rodando

**Solução:**
```bash
# Windows
netstat -ano | findstr :3010
taskkill /PID <PID> /F

# Ou simplesmente feche o terminal anterior
```

### Erro: "Cannot connect to PostgreSQL"

**Causa:** Container não está rodando

**Solução:**
```bash
cd .docker/dev
docker compose up -d postgres
docker compose logs postgres
```

### Erro: "Migration failed"

**Causa:** Schema do banco desatualizado

**Solução:**
```bash
yarn workspace @affine/server prisma migrate reset
yarn workspace @affine/server prisma migrate deploy
```

### Frontend não carrega (tela branca)

**Causa:** Build incompleto ou cache

**Solução:**
```bash
# Limpar e rebuildar servidor (inclui frontend)
Remove-Item -Recurse -Force packages\backend\server\static
yarn workspace @affine/server build

# Limpar cache do navegador
Ctrl+Shift+R (hard refresh)
```

## ✅ Checklist de Setup

- [ ] Containers Docker rodando (`docker compose ps`)
- [ ] PostgreSQL acessível (porta 5432)
- [ ] Redis acessível (porta 6379)
- [ ] LiteLLM rodando (porta 4000)
- [ ] Frontend buildado (`packages/frontend/web/dist/` existe)
- [ ] Backend rodando (porta 3010)
- [ ] Healthcheck OK (`curl http://localhost:3010/api/healthz`)
- [ ] Interface acessível (`http://localhost:3010`)
- [ ] Conta criada
- [ ] Login funcionando
- [ ] Workspace cloud criado

## 🎯 Fluxo Recomendado para Desenvolvimento

### Setup Inicial (Uma vez):
```bash
# 1. Instalar dependências
yarn install

# 2. Iniciar containers
cd .docker/dev && docker compose up -d && cd ../..

# 3. Build completo (frontend + backend)
.\scripts\build-for-selfhost.ps1
```

### Desenvolvimento Diário:

**Opção A - Produção Local (Mais estável):**
```bash
# Terminal 1: Backend
yarn workspace @affine/server dev

# Acessar: http://localhost:3010
```

**Opção B - Desenvolvimento (Hot Reload):**
```bash
# Terminal 1: Backend
yarn workspace @affine/server dev

# Terminal 2: Frontend
yarn dev

# Acessar: http://localhost:3000
```

## 📝 Notas Importantes

1. **Sempre inicie os containers primeiro** (PostgreSQL, Redis, etc)
2. **Build do frontend é necessário** para acessar via porta 3010
3. **Modo dev (porta 3000)** é melhor para desenvolvimento frontend
4. **Porta 3010** serve o frontend buildado (mais próximo de produção)
5. **Admin panel (8082)** é para configuração do servidor, não para usuários

## 🎉 Pronto!

Agora você tem:
- ✅ Ambiente completo rodando
- ✅ Conta criada
- ✅ Interface acessível
- ✅ Pronto para usar IA

**Próximo passo:** Criar um workspace cloud e testar a IA!
