#!/bin/bash

# All-in-one Lambda Build and Deploy Script
# This script builds and deploys your Lambda function in one command

set -e

echo "🎯 Lambda Build & Deploy Automation"
echo "===================================="
echo ""

# Step 1: Build
echo "Step 1: Building Lambda package..."
./build.sh

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Aborting deployment."
    exit 1
fi

echo ""
echo "Step 2: Deploying to AWS..."
./deploy.sh "$@"

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed."
    exit 1
fi

echo ""
echo "🎉 Build and deployment completed successfully!"
