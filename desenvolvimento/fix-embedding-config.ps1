# Script para corrigir a configuração de embedding no banco de dados

Write-Host "=== Corrigindo Configuração de Embedding ===" -ForegroundColor Cyan

# Executar SQL no container PostgreSQL
Write-Host "`nAtualizando configuração no banco de dados..." -ForegroundColor Yellow

docker exec -i affine_dev_services-postgres-1 psql -U affine -d affine -c "
UPDATE server_runtime_configs
SET value = jsonb_set(
  jsonb_set(
    value::jsonb,
    '{scenarios,scenarios,embedding}',
    '\"text-embedding-ada-002\"'::jsonb
  ),
  '{scenarios,override_enabled}',
  'true'::jsonb
)
WHERE module = 'copilot' 
  AND key = 'copilot';
"

Write-Host "`nVerificando configuração atualizada..." -ForegroundColor Yellow

docker exec -i affine_dev_services-postgres-1 psql -U affine -d affine -c "
SELECT 
  key,
  value->'scenarios'->'override_enabled' as override_enabled,
  value->'scenarios'->'scenarios'->'embedding' as embedding_model
FROM server_runtime_configs 
WHERE module = 'copilot' AND key = 'copilot';
"

Write-Host "`n=== Configuração Atualizada ===" -ForegroundColor Green
Write-Host "Agora reinicie o servidor AFFiNE para aplicar as mudanças:" -ForegroundColor Yellow
Write-Host "  Pressione Ctrl+C no terminal do 'yarn run dev' e execute novamente" -ForegroundColor White
