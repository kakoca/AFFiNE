# Troubleshooting: Admin Setup Issues

## Problemas Encontrados e Soluções

### 1. Erro GraphQL: "Cannot return null for non-nullable field ReleaseVersionType.changelog"

**Causa:** API externa retornava `changelog` vazio/null, mas o campo era obrigatório no schema GraphQL.

**Solução:**
```typescript
// packages/backend/server/src/core/config/resolver.ts
@Field({ nullable: true })  // Tornou o campo opcional
changelog?: string;

// Adicionou fallback
changelog: latest.body || '',
```

**Por quê:** A API de releases pode não ter changelog em algumas versões.

---

### 2. Página /admin/setup redirecionava para /admin/auth

**Causa:** Sistema detectava usuários existentes no banco (usuários de dev criados automaticamente) e considerava-se "inicializado".

**Problema raiz:** 
- `ServerService.initialized()` verifica se existe qualquer usuário
- Em modo dev, `createDevUsers()` cria 3 usuários automaticamente no bootstrap
- Sistema sempre considerava-se inicializado

**Tentativa de solução:** Reset do banco PostgreSQL
```bash
docker stop affine_dev_services-postgres-1
docker rm affine_dev_services-postgres-1
docker volume rm affine_dev_services_postgres_data
docker compose -f .docker/dev/compose.yml up -d postgres
yarn workspace @affine/server prisma migrate deploy
```

**Por quê:** Necessário remover volume Docker para limpar dados persistentes.

---

### 3. LiteLLM falhou após reset do PostgreSQL

**Causa:** Banco `litellm` foi removido junto com o volume.

**Solução:** LiteLLM se auto-recuperou:
- Detectou banco ausente
- Criou banco `litellm` automaticamente
- Aplicou 53 migrations
- Iniciou normalmente

**Por quê:** LiteLLM tem mecanismo de auto-recuperação integrado.

---

### 4. Usuários de dev sem permissão de admin

**Causa:** Tabela `features` estava vazia após reset - features não foram criadas.

**Diagnóstico:**
```sql
SELECT * FROM features WHERE feature = 'administrator';
-- Retornou 0 rows

SELECT u.email, f.feature FROM users u 
JOIN user_features uf ON u.id = uf.user_id 
JOIN features f ON uf.feature_id = f.id;
-- Retornou 0 rows
```

**Solução:** Criação manual das features e associação ao usuário:
```sql
-- Criar feature administrator
INSERT INTO features (feature, version, type, configs) 
VALUES ('administrator', 1, 0, '{}');

-- Associar ao usuário dev@affine.pro
INSERT INTO user_features (user_id, feature_id, reason, activated, name) 
SELECT id, 1, 'manual setup', true, 'administrator' 
FROM users WHERE email = 'dev@affine.pro';
```

**Por quê:** `createDevUsers()` não completou execução ou falhou silenciosamente.

---

### 5. Erro ao criar nova conta: "Feature free_plan_v1 not found"

**Causa:** Features de planos não existiam no banco.

**Solução:** Criação manual de todas as features necessárias:
```sql
INSERT INTO features (feature, version, type, configs) VALUES 
('free_plan_v1', 1, 1, '{"name":"free","blobLimit":104857600,"historyPeriod":604800000,"memberLimit":1}'),
('pro_plan_v1', 1, 1, '{"name":"pro","blobLimit":107374182400,"historyPeriod":7776000000,"memberLimit":1}'),
('unlimited_copilot', 1, 2, '{}')
ON CONFLICT (feature, version) DO NOTHING;
```

**Por quê:** Sistema tenta atribuir plano padrão ao criar usuário, mas features não existiam.

---

## Resumo da Causa Raiz

O problema principal foi que após o reset do banco:
1. As migrations foram aplicadas (estrutura OK)
2. Mas o bootstrap do servidor não completou a criação das features
3. Usuários foram criados sem features associadas
4. Sistema ficou em estado inconsistente

## Solução Definitiva

Para ambiente de desenvolvimento limpo:
1. Reset completo do banco
2. Aguardar servidor completar bootstrap
3. Verificar se features foram criadas
4. Se não, criar manualmente via SQL

## Features Necessárias

- `administrator` (type: 0) - Acesso ao painel admin
- `free_plan_v1` (type: 1) - Plano gratuito padrão
- `pro_plan_v1` (type: 1) - Plano pro
- `unlimited_copilot` (type: 2) - IA ilimitada

## Comandos Úteis

```bash
# Verificar features
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "SELECT feature, version FROM features;"

# Verificar usuários com admin
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "SELECT u.email, f.feature FROM users u JOIN user_features uf ON u.id = uf.user_id JOIN features f ON uf.feature_id = f.id WHERE f.feature = 'administrator';"

# Contar usuários
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "SELECT COUNT(*) FROM users;"
```
