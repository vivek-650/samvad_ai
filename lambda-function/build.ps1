# Lambda Build Script for Windows PowerShell
# This script prepares an optimized deployment package for AWS Lambda

$ErrorActionPreference = "Stop"

Write-Host "Building Lambda deployment package..." -ForegroundColor Cyan

# Configuration
$FUNCTION_NAME = "bot-scheduler-lambda"
$BUILD_DIR = "lambda-build"
$DEPLOY_PACKAGE = "lambda-deployment.zip"

# Clean previous build
Write-Host "Cleaning previous build..." -ForegroundColor Yellow
if (Test-Path $BUILD_DIR) {
    Remove-Item -Recurse -Force $BUILD_DIR
}
if (Test-Path $DEPLOY_PACKAGE) {
    Remove-Item -Force $DEPLOY_PACKAGE
}

# Create build directory
New-Item -ItemType Directory -Path $BUILD_DIR | Out-Null

# Copy source files
Write-Host "Copying source files..." -ForegroundColor Yellow
Copy-Item "index.js" "$BUILD_DIR/"
Copy-Item "package.json" "$BUILD_DIR/"
if (Test-Path "package-lock.json") {
    Copy-Item "package-lock.json" "$BUILD_DIR/"
}

# Copy Prisma schema
New-Item -ItemType Directory -Path "$BUILD_DIR/prisma" -Force | Out-Null
Copy-Item "prisma/schema.prisma" "$BUILD_DIR/prisma/"

# Navigate to build directory
Push-Location $BUILD_DIR

try {
    # Install production dependencies only
    Write-Host "Installing production dependencies..." -ForegroundColor Yellow
    npm ci --production --no-audit --no-fund

    # Generate Prisma Client with configured binary targets (includes Lambda runtime target)
    Write-Host "Generating Prisma Client for AWS Lambda..." -ForegroundColor Yellow
    npx prisma generate

    # Remove unnecessary files
    Write-Host "Removing unnecessary files..." -ForegroundColor Yellow

    # Remove Prisma CLI (not needed at runtime)
    if (Test-Path "node_modules/prisma") {
        Remove-Item -Recurse -Force "node_modules/prisma"
    }

    # Remove unnecessary Prisma engine binaries (keep rhel-openssl-3.0.x for Lambda)
    Get-ChildItem -Path "node_modules/.prisma/client" -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -like "libquery_engine-darwin*" -or
        $_.Name -like "libquery_engine-windows*" -or
        $_.Name -like "libquery_engine-debian*" -or
        $_.Name -like "schema-engine*" -or
        $_.Name -like "introspection-engine*" -or
        $_.Name -like "migration-engine*" -or
        $_.Name -like "prisma-fmt*"
    } | Remove-Item -Force -ErrorAction SilentlyContinue

    # Fail fast if the Lambda runtime engine is missing from the bundle.
    $requiredEngine = "node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node"
    if (-not (Test-Path $requiredEngine)) {
        throw "Missing required Prisma engine: $requiredEngine"
    }
    Write-Host "Prisma runtime engine present: $requiredEngine" -ForegroundColor Green

    # Remove other unnecessary files
    Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue | Where-Object {
        $_.Extension -in @(".md", ".txt", ".map") -or
        $_.Name -like "LICENSE*" -or
        $_.Name -like "CHANGELOG*" -or
        $_.Extension -eq ".ts" -or
        $_.Name -like "*.d.ts.map"
    } | Remove-Item -Force -ErrorAction SilentlyContinue

    # Remove unnecessary directories
    Get-ChildItem -Path "node_modules" -Recurse -Directory -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -in @("test", "tests", "docs", "examples", ".github", "coverage")
    } | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

    Write-Host "Build preparation complete." -ForegroundColor Green
}
catch {
    Pop-Location
    Write-Host "Build failed: $_" -ForegroundColor Red
    exit 1
}

# Return to parent directory
Pop-Location

# Create deployment package
Write-Host "Creating deployment package..." -ForegroundColor Yellow
Compress-Archive -Path "$BUILD_DIR\*" -DestinationPath $DEPLOY_PACKAGE -CompressionLevel Optimal -Force

# Get package size
$packageInfo = Get-Item $DEPLOY_PACKAGE
$packageSizeMB = [math]::Round($packageInfo.Length / 1MB, 2)

Write-Host ""
Write-Host "Build complete." -ForegroundColor Green
Write-Host "Package: $DEPLOY_PACKAGE" -ForegroundColor Cyan
Write-Host "Size: $packageSizeMB MB" -ForegroundColor Cyan
Write-Host ""

# Check size and provide guidance
if ($packageSizeMB -lt 50) {
    Write-Host "Package is under 50MB - can use direct AWS CLI deployment" -ForegroundColor Green
    Write-Host "  Run: .\deploy.ps1"
}
elseif ($packageSizeMB -lt 250) {
    Write-Host "Package is over 50MB - must use S3 for deployment" -ForegroundColor Yellow
    Write-Host "  Run: .\deploy.ps1 -UseS3"
}
else {
    Write-Host "Package is over 250MB - consider using Lambda Layers" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Configure AWS credentials if not already done"
Write-Host "  2. Update deploy.ps1 with your AWS settings"
Write-Host "  3. Run deployment script: .\deploy.ps1"