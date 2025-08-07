# Script de configuração do Supabase para Windows
# Execute este script para configurar o ambiente de desenvolvimento

Write-Host "Configurando Supabase..." -ForegroundColor Green

# Verificar se o Supabase CLI está instalado
Write-Host "Verificando Supabase CLI..." -ForegroundColor Yellow
try {
    $version = supabase --version
    Write-Host "Supabase CLI v$version encontrado" -ForegroundColor Green
} catch {
    Write-Host "Supabase CLI nao encontrado. Instalando via Scoop..." -ForegroundColor Red
    
    # Verificar se o Scoop está instalado
    try {
        scoop --version | Out-Null
    } catch {
        Write-Host "Instalando Scoop..." -ForegroundColor Yellow
        iwr -useb https://get.scoop.sh | iex
    }
    
    # Instalar Supabase CLI
    scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
    scoop install supabase
}

# Verificar se o Docker está rodando
Write-Host "Verificando Docker..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "Docker encontrado" -ForegroundColor Green
    
    # Verificar se o Docker Desktop está rodando
    $dockerProcess = Get-Process -Name "Docker Desktop" -ErrorAction SilentlyContinue
    if ($dockerProcess) {
        Write-Host "Docker Desktop esta rodando" -ForegroundColor Green
    } else {
        Write-Host "Docker Desktop nao esta rodando. Inicie o Docker Desktop manualmente." -ForegroundColor Yellow
        Write-Host "Aguardando Docker Desktop iniciar..." -ForegroundColor Yellow
        
        # Tentar iniciar Docker Desktop
        try {
            Start-Process "Docker Desktop" -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 10
        } catch {
            Write-Host "Nao foi possivel iniciar o Docker Desktop automaticamente." -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Docker nao encontrado. Instale o Docker Desktop: https://docs.docker.com/desktop/" -ForegroundColor Red
    exit 1
}

# Verificar arquivo de configuração
if (Test-Path ".env.local") {
    Write-Host "Arquivo .env.local encontrado" -ForegroundColor Green
} else {
    Write-Host "Arquivo .env.local nao encontrado. Verifique as configuracoes." -ForegroundColor Yellow
}

# Verificar configuração do Supabase
if (Test-Path "supabase/config.toml") {
    Write-Host "Configuracao do Supabase encontrada" -ForegroundColor Green
} else {
    Write-Host "Configuracao do Supabase nao encontrada" -ForegroundColor Red
}

Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Certifique-se de que o Docker Desktop está rodando" -ForegroundColor White
Write-Host "2. Execute 'npm run supabase:start' para iniciar o Supabase localmente" -ForegroundColor White
Write-Host "3. Execute 'npm run supabase:status' para verificar o status" -ForegroundColor White
Write-Host "4. Para conectar ao projeto remoto, execute 'supabase login' e 'supabase link'" -ForegroundColor White
Write-Host ""
Write-Host "Documentacao: SUPABASE-CONFIG.md" -ForegroundColor Cyan
Write-Host "Scripts disponiveis: npm run supabase:*" -ForegroundColor Cyan

Write-Host "Configuracao concluida!" -ForegroundColor Green