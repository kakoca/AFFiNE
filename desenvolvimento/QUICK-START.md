# 🚀 Quick Start - AFFiNE Self-Hosted

## Setup Inicial (Uma Vez)

```powershell
# 1. Instalar dependências
yarn install

# 2. Iniciar containers Docker
cd .docker/dev
docker compose up -d
cd ../..

# 3. Build completo
.\scripts\build-for-selfhost.ps1

# 4. Preparar banco de dados (primeira vez)
node packages/backend/server/scripts/self-host-predeploy.js

# 5. Iniciar backend
yarn workspace @affine/server dev
```

## Acessar

Abra: **http://localhost:3010**

## Criar Conta

**Opção 1 - Usuários de Desenvolvimento:**
- Email: `dev@affine.pro` / Senha: `dev`
- Email: `pro@affine.pro` / Senha: `pro`

**Opção 2 - Criar Nova:**
1. Clique em "Sign Up"
2. Preencha email e senha (mínimo 8 caracteres)
3. Confirme (veja email no Mailpit: http://localhost:8025)

## Usar IA

1. Faça login
2. Crie um workspace **cloud** (não local)
3. Use a IA normalmente

**Importante:** IA só funciona em workspaces cloud!

## Desenvolvimento Diário

```powershell
# Iniciar containers (se não estiverem rodando)
cd .docker/dev && docker compose up -d && cd ../..

# Iniciar backend
yarn workspace @affine/server dev

# (Opcional) Frontend com hot reload
yarn dev  # Acesse http://localhost:3000
```

## Rebuild (Após Mudanças)

```powershell
# Build completo
.\scripts\build-for-selfhost.ps1

# Reiniciar backend
# Ctrl+C no terminal do backend e rodar novamente:
yarn workspace @affine/server dev
```

## Portas

| Serviço | Porta | URL |
|---------|-------|-----|
| Frontend (Produção) | 3010 | http://localhost:3010 |
| Frontend (Dev) | 3000 | http://localhost:3000 |
| LiteLLM | 4000 | http://localhost:4000 |
| Admin Panel | 8082 | http://localhost:8082 |
| Mailpit | 8025 | http://localhost:8025 |

## Troubleshooting

### Erro: "ENOENT: selfhost.html"
```powershell
.\scripts\build-for-selfhost.ps1
```

### Erro: "Port already in use"
Feche o terminal anterior ou mate o processo.

### IA não funciona
1. Verifique se está logado
2. Verifique se o workspace é **cloud** (não local)
3. Verifique se LiteLLM está rodando: `docker compose ps litellm`

## Documentação Completa

- `SETUP-COMPLETO-PASSO-A-PASSO.md` - Setup detalhado
- `COMO-USAR-IA-SELFHOSTED.md` - Como usar IA
- `LITELLM-SETUP-GUIDE.md` - Configuração LiteLLM
- `RESUMO-CONFIGURACAO.md` - Resumo geral
