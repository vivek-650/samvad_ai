# Deploy Lambda with Environment Variables
# Read .env from main project and deploy

$ErrorActionPreference = "Stop"

Write-Host "`n=== Setting Environment Variables from .env ===" -ForegroundColor Cyan

# Read .env file from main project
$envFile = Join-Path $PSScriptRoot "..\\.env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)\s*=\s*(.+)\s*$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
            Write-Host "  ✓ Set $name" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ✗ .env file not found at $envFile" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Deploying to AWS Lambda ===" -ForegroundColor Cyan

# Run the deploy script
& "$PSScriptRoot\deploy.ps1"
