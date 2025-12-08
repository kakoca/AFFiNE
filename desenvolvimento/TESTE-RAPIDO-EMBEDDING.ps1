# Teste Rápido de Embedding
# Execute este script para diagnosticar o problema

Write-Host "🔍 Diagnóstico de Embedding - AFFiNE" -ForegroundColor Cyan
Write-Host ""

# Teste 1: LiteLLM Health
Write-Host "1️⃣ Testando LiteLLM Health..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "http://localhost:4000/health" -ErrorAction Stop
    Write-Host "   ✅ LiteLLM está respondendo" -ForegroundColor Green
} catch {
    Write-Host "   ❌ LiteLLM não está respondendo" -ForegroundColor Red
    Write-Host "   Execute: docker compose up -d litellm" -ForegroundColor Yellow
    exit 1
}

# Teste 2: Modelos Disponíveis
Write-Host ""
Write-Host "2️⃣ Verificando modelos disponíveis..." -ForegroundColor Yellow
try {
    $models = Invoke-WebRequest -Uri "http://localhost:4000/v1/models" -Headers @{"Authorization"="Bearer sk-affine-dev-key"} -ErrorAction Stop
    $modelsJson = $models.Content | ConvertFrom-Json
    $embedModels = $modelsJson.data | Where-Object { $_.id -like "*embed*" }
    
    if ($embedModels) {
        Write-Host "   ✅ Modelos de embedding encontrados:" -ForegroundColor Green
        foreach ($model in $embedModels) {
            Write-Host "      - $($model.id)" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ❌ Nenhum modelo de embedding encontrado" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Erro ao buscar modelos" -ForegroundColor Red
}

# Teste 3: Testar Embedding
Write-Host ""
Write-Host "3️⃣ Testando geração de embedding..." -ForegroundColor Yellow
try {
    $body = @{
        model = "titan-embed-text"
        input = "test"
    } | ConvertTo-Json

    $response = Invoke-WebRequest -Uri "http://localhost:4000/v1/embeddings" `
        -Method POST `
        -Headers @{
            "Authorization"="Bearer sk-affine-dev-key"
            "Content-Type"="application/json"
        } `
        -Body $body `
        -ErrorAction Stop

    $result = $response.Content | ConvertFrom-Json
    $dimensions = $result.data[0].embedding.Count
    
    Write-Host "   ✅ Embedding gerado com sucesso!" -ForegroundColor Green
    Write-Host "      Dimensões: $dimensions" -ForegroundColor Cyan
    
    if ($dimensions -eq 1024) {
        Write-Host "      ✅ Dimensões corretas (1024)" -ForegroundColor Green
    } else {
        Write-Host "      ⚠️ Dimensões incorretas (esperado: 1024, recebido: $dimensions)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Erro ao gerar embedding" -ForegroundColor Red
    Write-Host "   Erro: $($_.Exception.Message)" -ForegroundColor Red
}

# Teste 4: Verificar Configuração no Banco
Write-Host ""
Write-Host "4️⃣ Verificando configuração no banco de dados..." -ForegroundColor Yellow
Write-Host "   Execute manualmente:" -ForegroundColor Cyan
Write-Host "   docker exec -it affine_dev_services-postgres-1 psql -U affine -d affine -c `"SELECT key, value FROM server_runtime_configs WHERE key = 'copilot';`"" -ForegroundColor Gray

# Resumo
Write-Host ""
Write-Host "📊 Resumo do Diagnóstico" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Se todos os testes passaram:" -ForegroundColor Yellow
Write-Host "1. Pare o servidor AFFiNE (Ctrl+C)" -ForegroundColor White
Write-Host "2. Aguarde 5 segundos" -ForegroundColor White
Write-Host "3. Inicie novamente: yarn workspace @affine/server start" -ForegroundColor White
Write-Host "4. Aguarde a mensagem 'Application is running'" -ForegroundColor White
Write-Host "5. Teste anexar documento no chat" -ForegroundColor White
Write-Host ""
Write-Host "Se o erro persistir:" -ForegroundColor Yellow
Write-Host "1. Veja o arquivo: desenvolvimento/DIAGNOSTICO-EMBEDDING.md" -ForegroundColor White
Write-Host "2. Execute os testes de diagnóstico detalhados" -ForegroundColor White
Write-Host ""
