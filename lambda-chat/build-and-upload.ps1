# Quick build and deploy script for lambda-chat
Write-Host "Building lambda-chat deployment package..." -ForegroundColor Cyan

# Clean
if (Test-Path "lambda-build") {
    Remove-Item -Recurse -Force "lambda-build" -ErrorAction Stop
}
if (Test-Path "lambda-deployment.zip") {
    Remove-Item -Force "lambda-deployment.zip" -ErrorAction Stop
}

# Create build dir
New-Item -ItemType Directory -Path "lambda-build" | Out-Null

# Copy files
Write-Host "Copying source files..." -ForegroundColor Yellow
Copy-Item "lambda-chat-reset.js" "lambda-build/index.js"
Copy-Item "package.json" "lambda-build/"
if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" "lambda-build/"
}
New-Item -ItemType Directory -Path "lambda-build/prisma" -Force | Out-Null
Copy-Item "prisma/schema.prisma" "lambda-build/prisma/"

# Install and generate
Write-Host "Installing dependencies..." -ForegroundColor Yellow
cd lambda-build
npm ci --production --no-audit --no-fund

Write-Host "Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate

# Check binaries
Write-Host "Binaries generated:" -ForegroundColor Yellow
Get-ChildItem "node_modules/.prisma/client" -Filter "*.so.node" -ErrorAction SilentlyContinue | Select-Object Name

# Remove prisma CLI
if (Test-Path "node_modules/prisma") {
    Remove-Item -Recurse -Force "node_modules/prisma"
}

# Back to parent
cd ..

# Create ZIP
Write-Host "Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "lambda-build\*" -DestinationPath "lambda-deployment.zip" -CompressionLevel Optimal -Force

$sizeMB = [math]::Round((Get-Item "lambda-deployment.zip").Length / 1MB, 2)
Write-Host "Package created: $sizeMB MB" -ForegroundColor Green

# Upload to S3
Write-Host "Uploading to S3..." -ForegroundColor Yellow
& "C:/Program Files/Amazon/AWSCLIV2/aws" s3 cp lambda-deployment.zip s3://samvad-ai-lambda-deployments/lambda-chat/lambda-deployment.zip --region us-east-1

Write-Host "Upload complete!" -ForegroundColor Green
