-- Verificar configuração atual do Copilot
SELECT key, value 
FROM "server_runtime_configs" 
WHERE module = 'copilot';

-- Atualizar o modelo de embedding para text-embedding-ada-002
-- Este é o alias que criamos no LiteLLM que mapeia para Titan
UPDATE "server_runtime_configs"
SET value = jsonb_set(
  value::jsonb,
  '{scenarios,scenarios,embedding}',
  '"text-embedding-ada-002"'::jsonb
)
WHERE module = 'copilot' 
  AND key = 'copilot';

-- Verificar se override_enabled está ativo
UPDATE "server_runtime_configs"
SET value = jsonb_set(
  value::jsonb,
  '{scenarios,override_enabled}',
  'true'::jsonb
)
WHERE module = 'copilot' 
  AND key = 'copilot';

-- Verificar resultado
SELECT key, value 
FROM "server_runtime_configs" 
WHERE module = 'copilot';
