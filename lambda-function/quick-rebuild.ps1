# Quick rebuild script
Write-Host "Rebuilding Lambda package..." -ForegroundColor Cyan

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
Copy-Item "index.js" "lambda-build/"
Copy-Item "package.json" "lambda-build/"
if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" "lambda-build/"
}
New-Item -ItemType Directory -Path "lambda-build/prisma" -Force | Out-Null
Copy-Item "prisma/schema.prisma" "lambda-build/prisma/"

# Install and generate
cd lambda-build
npm ci --production --no-audit --no-fund
npx prisma generate

# Check binaries
Write-Host "`nBinaries generated:" -ForegroundColor Yellow
Get-ChildItem "node_modules/.prisma/client" -Filter "*.so.node" | Select-Object Name

# Remove prisma CLI
if (Test-Path "node_modules/prisma") {
    Remove-Item -Recurse -Force "node_modules/prisma"
}

# Back to parent
cd ..

# Create ZIP
Compress-Archive -Path "lambda-build\*" -DestinationPath "lambda-deployment.zip" -CompressionLevel Optimal -Force

$sizeMB = [math]::Round((Get-Item "lambda-deployment.zip").Length / 1MB, 2)
Write-Host "`nPackage created: $sizeMB MB" -ForegroundColor Green
