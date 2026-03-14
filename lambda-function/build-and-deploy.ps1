# All-in-one Lambda Build and Deploy Script for Windows
# This script builds and deploys your Lambda function in one command

param(
    [switch]$UseS3
)

Write-Host "🎯 Lambda Build & Deploy Automation" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Build
Write-Host "Step 1: Building Lambda package..." -ForegroundColor Yellow
& .\build.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed. Aborting deployment." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 2: Deploying to AWS..." -ForegroundColor Yellow

if ($UseS3) {
    & .\deploy.ps1 -UseS3
} else {
    & .\deploy.ps1
}

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🎉 Build and deployment completed successfully!" -ForegroundColor Green
