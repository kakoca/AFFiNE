# Script para verificar a configuração de embedding

Write-Host "=== Verificando Configuração de Embedding ===" -ForegroundColor Cyan

Write-Host "`nVerificando configuração no banco de dados..." -ForegroundColor Yellow

docker exec -i affine_dev_services-postgres-1 psql -U affine -d affine -c "
SELECT 
  key,
  value->'scenarios'->'override_enabled' as override_enabled,
  value->'scenarios'->'scenarios'->'embedding' as embedding_model,
  value->'providers'->'openai'->'apiKey' as openai_key,
  value->'providers'->'openai'->'baseURL' as openai_url
FROM server_runtime_configs 
WHERE module = 'copilot' AND key = 'copilot';
"

Write-Host "`n=== Análise ===" -ForegroundColor Green
Write-Host "Se override_enabled = false ou null, o sistema usa 'gemini-embedding-001'" -ForegroundColor Yellow
Write-Host "Se override_enabled = true, o sistema usa o modelo em embedding_model" -ForegroundColor Yellow
Write-Host "`nPara corrigir, execute: .\desenvolvimento\fix-embedding-config.ps1" -ForegroundColor White
