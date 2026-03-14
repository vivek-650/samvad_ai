#!/bin/bash

# Lambda Deployment Script
# Deploys Lambda function using AWS CLI

set -e

# ==================== CONFIGURATION ====================
# Update these values for your deployment

FUNCTION_NAME="bot-scheduler-lambda"
RUNTIME="nodejs20.x"
HANDLER="index.handler"
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE"  # Update this!
REGION="us-east-1"  # Update this!
MEMORY_SIZE=512
TIMEOUT=300  # 5 minutes
ARCHITECTURE="x86_64"

# S3 configuration (only used if --use-s3 flag is provided)
S3_BUCKET="your-lambda-deployment-bucket"  # Update this!
S3_KEY="lambda-functions/${FUNCTION_NAME}/$(date +%Y%m%d-%H%M%S)-lambda-deployment.zip"

# Environment variables for Lambda function
ENV_VARS='{
    "DATABASE_URL": "your-database-url",
    "GOOGLE_CLIENT_ID": "your-google-client-id",
    "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
    "MEETING_BAAS_API_KEY": "your-meeting-baas-api-key",
    "WEBHOOK_URL": "your-webhook-url"
}'

# ==================== SCRIPT ====================

DEPLOY_PACKAGE="lambda-deployment.zip"
USE_S3=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --use-s3)
            USE_S3=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check if package exists
if [ ! -f "$DEPLOY_PACKAGE" ]; then
    echo "❌ Deployment package not found: $DEPLOY_PACKAGE"
    echo "   Run ./build.sh first"
    exit 1
fi

# Get package size
PACKAGE_SIZE_MB=$(du -m "$DEPLOY_PACKAGE" | cut -f1)

# Auto-detect if S3 is needed
if [ "$PACKAGE_SIZE_MB" -gt 50 ] && [ "$USE_S3" = false ]; then
    echo "⚠️  Package size is ${PACKAGE_SIZE_MB}MB (over 50MB limit)"
    echo "   Automatically switching to S3 deployment method"
    USE_S3=true
fi

echo "🚀 Deploying Lambda function: $FUNCTION_NAME"
echo "📦 Package: $DEPLOY_PACKAGE (${PACKAGE_SIZE_MB}MB)"
echo "🌍 Region: $REGION"
echo ""

# Check if function exists
FUNCTION_EXISTS=$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$REGION" 2>&1 || true)

if echo "$FUNCTION_EXISTS" | grep -q "ResourceNotFoundException"; then
    echo "📝 Function does not exist. Creating new function..."

    if [ "$USE_S3" = true ]; then
        # Upload to S3
        echo "📤 Uploading package to S3..."
        aws s3 cp "$DEPLOY_PACKAGE" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

        # Create function from S3
        aws lambda create-function \
            --function-name "$FUNCTION_NAME" \
            --runtime "$RUNTIME" \
            --role "$ROLE_ARN" \
            --handler "$HANDLER" \
            --code "S3Bucket=${S3_BUCKET},S3Key=${S3_KEY}" \
            --timeout "$TIMEOUT" \
            --memory-size "$MEMORY_SIZE" \
            --architectures "$ARCHITECTURE" \
            --environment "Variables=${ENV_VARS}" \
            --region "$REGION"
    else
        # Create function with direct upload
        aws lambda create-function \
            --function-name "$FUNCTION_NAME" \
            --runtime "$RUNTIME" \
            --role "$ROLE_ARN" \
            --handler "$HANDLER" \
            --zip-file "fileb://$DEPLOY_PACKAGE" \
            --timeout "$TIMEOUT" \
            --memory-size "$MEMORY_SIZE" \
            --architectures "$ARCHITECTURE" \
            --environment "Variables=${ENV_VARS}" \
            --region "$REGION"
    fi

    echo "✅ Function created successfully!"

else
    echo "🔄 Function exists. Updating function code..."

    if [ "$USE_S3" = true ]; then
        # Upload to S3
        echo "📤 Uploading package to S3..."
        aws s3 cp "$DEPLOY_PACKAGE" "s3://${S3_BUCKET}/${S3_KEY}" --region "$REGION"

        # Update function code from S3
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --s3-bucket "$S3_BUCKET" \
            --s3-key "$S3_KEY" \
            --region "$REGION"
    else
        # Update function code with direct upload
        aws lambda update-function-code \
            --function-name "$FUNCTION_NAME" \
            --zip-file "fileb://$DEPLOY_PACKAGE" \
            --region "$REGION"
    fi

    echo "⏳ Waiting for function update to complete..."
    aws lambda wait function-updated \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION"

    echo "🔧 Updating function configuration..."
    aws lambda update-function-configuration \
        --function-name "$FUNCTION_NAME" \
        --runtime "$RUNTIME" \
        --handler "$HANDLER" \
        --timeout "$TIMEOUT" \
        --memory-size "$MEMORY_SIZE" \
        --environment "Variables=${ENV_VARS}" \
        --region "$REGION" \
        > /dev/null

    echo "✅ Function updated successfully!"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Function details:"
echo "  Name: $FUNCTION_NAME"
echo "  Region: $REGION"
echo "  Runtime: $RUNTIME"
echo "  Memory: ${MEMORY_SIZE}MB"
echo "  Timeout: ${TIMEOUT}s"
echo ""
echo "View your function:"
echo "  https://console.aws.amazon.com/lambda/home?region=${REGION}#/functions/${FUNCTION_NAME}"
echo ""
echo "Test your function:"
echo "  aws lambda invoke --function-name $FUNCTION_NAME --region $REGION response.json"
echo "  cat response.json"
