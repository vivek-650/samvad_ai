# Lambda Deployment Script for Windows PowerShell
# Deploys Lambda function using AWS CLI

param(
    [switch]$UseS3
)

$ErrorActionPreference = "Stop"

# ==================== CONFIGURATION ====================
# Update these values for your deployment

$FUNCTION_NAME = "bot-scheduler-lambda"
$RUNTIME = "nodejs20.x"
$HANDLER = "index.handler"
$ROLE_ARN = "arn:aws:iam::793523167017:role/bot-scheduler-lambda-role"
$REGION = "us-east-1"
$MEMORY_SIZE = 512
$TIMEOUT = 300  # 5 minutes
$ARCHITECTURE = "x86_64"

# S3 configuration (only used if -UseS3 flag is provided)
$S3_BUCKET = "samvad-ai-lambda-deployments"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$S3_KEY = "lambda-functions/$FUNCTION_NAME/$timestamp-lambda-deployment.zip"

# Environment variables for Lambda function
# NOTE: These values should be set via AWS Secrets Manager or Parameter Store
# DO NOT hardcode secrets in this file
$ENV_VARS = @"
{
    "DATABASE_URL": "$env:DATABASE_URL",
    "GOOGLE_CLIENT_ID": "$env:GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET": "$env:GOOGLE_CLIENT_SECRET",
    "MEETING_BAAS_API_KEY": "$env:MEETING_BAAS_API_KEY",
    "WEBHOOK_URL": "$env:WEBHOOK_URL"
}
"@ -replace "`r`n", "" -replace "`n", ""

# ==================== SCRIPT ====================

$DEPLOY_PACKAGE = "lambda-deployment.zip"

# Check if package exists
if (-not (Test-Path $DEPLOY_PACKAGE)) {
    Write-Host "❌ Deployment package not found: $DEPLOY_PACKAGE" -ForegroundColor Red
    Write-Host "   Run .\build.ps1 first" -ForegroundColor Yellow
    exit 1
}

# Get package size
$packageInfo = Get-Item $DEPLOY_PACKAGE
$packageSizeMB = [math]::Round($packageInfo.Length / 1MB, 2)

# Auto-detect if S3 is needed
if ($packageSizeMB -gt 50 -and -not $UseS3) {
    Write-Host "⚠️  Package size is ${packageSizeMB}MB (over 50MB limit)" -ForegroundColor Yellow
    Write-Host "   Automatically switching to S3 deployment method" -ForegroundColor Yellow
    $UseS3 = $true
}

Write-Host "🚀 Deploying Lambda function: $FUNCTION_NAME" -ForegroundColor Cyan
Write-Host "📦 Package: $DEPLOY_PACKAGE (${packageSizeMB}MB)" -ForegroundColor Cyan
Write-Host "🌍 Region: $REGION" -ForegroundColor Cyan
Write-Host ""

# Check if function exists
try {
    $existingFunction = aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1
    $functionExists = $LASTEXITCODE -eq 0
} catch {
    $functionExists = $false
}

if (-not $functionExists) {
    Write-Host "📝 Function does not exist. Creating new function..." -ForegroundColor Yellow

    if ($UseS3) {
        # Upload to S3
        Write-Host "📤 Uploading package to S3..." -ForegroundColor Yellow
        aws s3 cp $DEPLOY_PACKAGE "s3://${S3_BUCKET}/${S3_KEY}" --region $REGION

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to upload to S3" -ForegroundColor Red
            exit 1
        }

        # Create function from S3
        aws lambda create-function `
            --function-name $FUNCTION_NAME `
            --runtime $RUNTIME `
            --role $ROLE_ARN `
            --handler $HANDLER `
            --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" `
            --timeout $TIMEOUT `
            --memory-size $MEMORY_SIZE `
            --architectures $ARCHITECTURE `
            --environment "Variables=${ENV_VARS}" `
            --region $REGION
    } else {
        # Create function with direct upload
        aws lambda create-function `
            --function-name $FUNCTION_NAME `
            --runtime $RUNTIME `
            --role $ROLE_ARN `
            --handler $HANDLER `
            --zip-file "fileb://$DEPLOY_PACKAGE" `
            --timeout $TIMEOUT `
            --memory-size $MEMORY_SIZE `
            --architectures $ARCHITECTURE `
            --environment "Variables=${ENV_VARS}" `
            --region $REGION
    }

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Function created successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create function" -ForegroundColor Red
        exit 1
    }

} else {
    Write-Host "🔄 Function exists. Updating function code..." -ForegroundColor Yellow

    if ($UseS3) {
        # Upload to S3
        Write-Host "📤 Uploading package to S3..." -ForegroundColor Yellow
        aws s3 cp $DEPLOY_PACKAGE "s3://${S3_BUCKET}/${S3_KEY}" --region $REGION

        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to upload to S3" -ForegroundColor Red
            exit 1
        }

        # Update function code from S3
        aws lambda update-function-code `
            --function-name $FUNCTION_NAME `
            --s3-bucket $S3_BUCKET `
            --s3-key $S3_KEY `
            --region $REGION
    } else {
        # Update function code with direct upload
        aws lambda update-function-code `
            --function-name $FUNCTION_NAME `
            --zip-file "fileb://$DEPLOY_PACKAGE" `
            --region $REGION
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to update function code" -ForegroundColor Red
        exit 1
    }

    Write-Host "⏳ Waiting for function update to complete..." -ForegroundColor Yellow
    aws lambda wait function-updated `
        --function-name $FUNCTION_NAME `
        --region $REGION

    Write-Host "🔧 Updating function configuration..." -ForegroundColor Yellow
    aws lambda update-function-configuration `
        --function-name $FUNCTION_NAME `
        --runtime $RUNTIME `
        --handler $HANDLER `
        --timeout $TIMEOUT `
        --memory-size $MEMORY_SIZE `
        --environment "Variables=${ENV_VARS}" `
        --region $REGION | Out-Null

    Write-Host "✅ Function updated successfully!" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Function details:"
Write-Host "  Name: $FUNCTION_NAME" -ForegroundColor Cyan
Write-Host "  Region: $REGION" -ForegroundColor Cyan
Write-Host "  Runtime: $RUNTIME" -ForegroundColor Cyan
Write-Host "  Memory: ${MEMORY_SIZE}MB" -ForegroundColor Cyan
Write-Host "  Timeout: ${TIMEOUT}s" -ForegroundColor Cyan
Write-Host ""
Write-Host "View your function:"
Write-Host "  https://console.aws.amazon.com/lambda/home?region=${REGION}#/functions/${FUNCTION_NAME}" -ForegroundColor Yellow
Write-Host ""
Write-Host "Test your function:"
Write-Host "  aws lambda invoke --function-name $FUNCTION_NAME --region $REGION response.json" -ForegroundColor Yellow
Write-Host "  Get-Content response.json" -ForegroundColor Yellow
