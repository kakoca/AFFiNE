# Features Schema Reference

## Localização das Regras

**Arquivo principal:** `packages/backend/server/src/models/common/feature.ts`

Este arquivo contém:
1. **Schemas Zod** - Validação de estrutura dos configs
2. **FeatureConfigs** - Valores padrão e configurações de cada feature
3. **Enums** - Lista de todas as features disponíveis

---

## Schemas de Validação (Zod)

### UserPlanQuotaConfig
Usado para: `free_plan_v1`, `pro_plan_v1`, `lifetime_pro_plan_v1`

```typescript
{
  name: string,                    // Nome do plano (ex: "Free", "Pro")
  blobLimit: number,               // Limite de tamanho de arquivo único
  businessBlobLimit?: number,      // OPCIONAL - Limite para business (fallback após downgrade)
  storageQuota: number,            // Quota total de armazenamento
  historyPeriod: number,           // Período de histórico em milissegundos
  memberLimit: number,             // Limite de membros
  copilotActionLimit?: number      // OPCIONAL - Limite de ações do Copilot
}
```

### WorkspaceQuotaConfig
Usado para: `team_plan_v1`

```typescript
{
  name: string,
  blobLimit: number,
  businessBlobLimit?: number,
  storageQuota: number,
  historyPeriod: number,
  memberLimit: number,
  seatQuota: number                // Quota de assentos (específico para workspace)
  // NÃO tem copilotActionLimit
}
```

### EMPTY_CONFIG
Usado para: `administrator`, `unlimited_copilot`, `ai_early_access`, `unlimited_workspace`

```typescript
{}  // Objeto vazio
```

### EarlyAccessConfig
Usado para: `early_access`

```typescript
{
  whitelist: string[]              // Array de emails permitidos
}
```

---

## Constantes Úteis

```typescript
// Definidas em packages/backend/server/src/base/constants.ts
OneMB = 1048576           // 1 MB em bytes
OneGB = 1073741824        // 1 GB em bytes  
OneDay = 86400000         // 1 dia em milissegundos
```

---

## Configurações Padrão (FeatureConfigs)

### free_plan_v1
```json
{
  "type": 1,
  "configs": {
    "name": "Free",
    "blobLimit": 10485760,              // 10 MB
    "businessBlobLimit": 104857600,     // 100 MB
    "storageQuota": 10737418240,        // 10 GB
    "historyPeriod": 604800000,         // 7 dias
    "memberLimit": 3,
    "copilotActionLimit": 10
  }
}
```

### pro_plan_v1
```json
{
  "type": 1,
  "configs": {
    "name": "Pro",
    "blobLimit": 104857600,             // 100 MB
    "storageQuota": 107374182400,       // 100 GB
    "historyPeriod": 2592000000,        // 30 dias
    "memberLimit": 10,
    "copilotActionLimit": 10
  }
}
```

### lifetime_pro_plan_v1
```json
{
  "type": 1,
  "configs": {
    "name": "Lifetime Pro",
    "blobLimit": 104857600,             // 100 MB
    "storageQuota": 1099511627776,      // 1024 GB (1 TB)
    "historyPeriod": 2592000000,        // 30 dias
    "memberLimit": 10,
    "copilotActionLimit": 10
  }
}
```

### team_plan_v1
```json
{
  "type": 1,
  "configs": {
    "name": "Team Workspace",
    "blobLimit": 524288000,             // 500 MB
    "storageQuota": 107374182400,       // 100 GB
    "seatQuota": 21474836480,           // 20 GB
    "historyPeriod": 2592000000,        // 30 dias
    "memberLimit": 1
  }
}
```

### administrator
```json
{
  "type": 0,
  "configs": {}
}
```

### unlimited_copilot
```json
{
  "type": 2,
  "configs": {}
}
```

### ai_early_access
```json
{
  "type": 0,
  "configs": {}
}
```

### early_access
```json
{
  "type": 0,
  "configs": {
    "whitelist": []
  }
}
```

### unlimited_workspace
```json
{
  "type": 0,
  "configs": {}
}
```

---

## Feature Types

```typescript
enum FeatureType {
  Feature = 0,    // Feature simples (on/off)
  Quota = 1,      // Feature com quotas/limites
  // Type 2 também existe mas não está explicitamente nomeado
}
```

---

## SQL para Criar Features Corretamente

### Template Base
```sql
INSERT INTO features (feature, version, type, configs) 
VALUES ('feature_name', 1, type_number, 'json_config')
ON CONFLICT (feature, version) DO NOTHING;
```

### Exemplos Práticos

```sql
-- Feature simples (administrator)
INSERT INTO features (feature, version, type, configs) 
VALUES ('administrator', 1, 0, '{}');

-- Feature com quota (free_plan_v1)
INSERT INTO features (feature, version, type, configs) 
VALUES ('free_plan_v1', 1, 1, '{
  "name": "Free",
  "blobLimit": 10485760,
  "businessBlobLimit": 104857600,
  "storageQuota": 10737418240,
  "historyPeriod": 604800000,
  "memberLimit": 3,
  "copilotActionLimit": 10
}');

-- Feature com whitelist (early_access)
INSERT INTO features (feature, version, type, configs) 
VALUES ('early_access', 1, 0, '{"whitelist": ["user@example.com"]}');
```

---

## Validação Manual

Para verificar se uma configuração está válida antes de inserir:

1. **Verifique o schema** em `packages/backend/server/src/models/common/feature.ts`
2. **Procure por `FeaturesShapes`** - mostra qual schema usar
3. **Procure por `FeatureConfigs`** - mostra valores padrão recomendados
4. **Teste no código:**
   ```typescript
   import { FeaturesShapes } from './models/common/feature';
   
   const result = FeaturesShapes.free_plan_v1.safeParse(yourConfig);
   if (!result.success) {
     console.error(result.error);
   }
   ```

---

## Checklist para Adicionar/Modificar Features

- [ ] Verificar schema correto em `FeaturesShapes`
- [ ] Incluir TODOS os campos obrigatórios (sem `?`)
- [ ] Usar valores numéricos corretos (bytes, milissegundos)
- [ ] Definir `type` correto (0=Feature, 1=Quota)
- [ ] Testar após inserção acessando a feature no sistema
- [ ] Verificar logs do servidor para erros de validação

---

## Comandos Úteis

```bash
# Ver todas as features e configs
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "SELECT feature, version, type, configs FROM features;"

# Ver features de um usuário
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "SELECT u.email, f.feature, f.configs FROM users u JOIN user_features uf ON u.id = uf.user_id JOIN features f ON uf.feature_id = f.id WHERE u.email = 'user@example.com';"

# Atualizar config de uma feature
docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c "UPDATE features SET configs = 'new_json_config' WHERE feature = 'feature_name';"
```

---

## Erros Comuns

### "Invalid feature config for X"
- **Causa:** Config não passa na validação Zod
- **Solução:** Verificar schema em `FeaturesShapes` e incluir todos os campos obrigatórios

### "Feature X not found"
- **Causa:** Feature não existe na tabela `features`
- **Solução:** Inserir feature com SQL

### "Cannot read property of undefined"
- **Causa:** Campo obrigatório faltando no config JSON
- **Solução:** Adicionar campo faltante baseado no schema
