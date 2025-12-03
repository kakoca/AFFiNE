# Script para build completo do AFFiNE Self-Hosted
# Este script builda o frontend e backend e prepara tudo para rodar

Write-Host "[*] Iniciando build do AFFiNE Self-Hosted..." -ForegroundColor Cyan
Write-Host ""

# 1. Build do frontend web
Write-Host "[1/5] Building @affine/web..." -ForegroundColor Yellow
yarn affine bundle -p @affine/web
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Erro ao buildar @affine/web" -ForegroundColor Red
    exit 1
}

# 2. Build do admin
Write-Host "[2/5] Building @affine/admin..." -ForegroundColor Yellow
yarn affine bundle -p @affine/admin
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Erro ao buildar @affine/admin" -ForegroundColor Red
    exit 1
}

# 3. Build do mobile (opcional, mas necessário para selfhost completo)
Write-Host "[3/5] Building @affine/mobile..." -ForegroundColor Yellow
yarn affine bundle -p @affine/mobile
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Aviso: Erro ao buildar @affine/mobile (pode ser ignorado)" -ForegroundColor Yellow
}

# 4. Build do servidor
Write-Host "[4/5] Building @affine/server..." -ForegroundColor Yellow
yarn affine bundle -p @affine/server
if ($LASTEXITCODE -ne 0) {
    Write-Host "[X] Erro ao buildar @affine/server" -ForegroundColor Red
    exit 1
}

# 5. Copiar arquivos estáticos
Write-Host "[5/5] Copiando arquivos estaticos..." -ForegroundColor Yellow

$staticDir = "packages\backend\server\static"

# Criar diretório static se não existir
if (!(Test-Path $staticDir)) {
    New-Item -ItemType Directory -Path $staticDir -Force | Out-Null
}

# Copiar web
if (Test-Path "packages\frontend\apps\web\dist") {
    Write-Host "  > Copiando web..." -ForegroundColor Gray
    Copy-Item -Path "packages\frontend\apps\web\dist\*" -Destination $staticDir -Recurse -Force
} else {
    Write-Host "  [!] Web dist nao encontrado" -ForegroundColor Yellow
}

# Copiar admin
if (Test-Path "packages\frontend\admin\dist") {
    Write-Host "  > Copiando admin..." -ForegroundColor Gray
    $adminDir = "$staticDir\admin"
    if (!(Test-Path $adminDir)) {
        New-Item -ItemType Directory -Path $adminDir -Force | Out-Null
    }
    Copy-Item -Path "packages\frontend\admin\dist\*" -Destination $adminDir -Recurse -Force
} else {
    Write-Host "  [!] Admin dist nao encontrado" -ForegroundColor Yellow
}

# Copiar mobile
if (Test-Path "packages\frontend\apps\mobile\dist") {
    Write-Host "  > Copiando mobile..." -ForegroundColor Gray
    $mobileDir = "$staticDir\mobile"
    if (!(Test-Path $mobileDir)) {
        New-Item -ItemType Directory -Path $mobileDir -Force | Out-Null
    }
    Copy-Item -Path "packages\frontend\apps\mobile\dist\*" -Destination $mobileDir -Recurse -Force
} else {
    Write-Host "  [!] Mobile dist nao encontrado (pode ser ignorado)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[OK] Build completo!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "  1. Iniciar containers: cd .docker/dev && docker compose up -d" -ForegroundColor White
Write-Host "  2. Iniciar backend: yarn workspace @affine/server dev" -ForegroundColor White
Write-Host "  3. Acessar: http://localhost:3010" -ForegroundColor White
Write-Host ""
