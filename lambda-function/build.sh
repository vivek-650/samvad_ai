#!/bin/bash

# Lambda Build Script
# This script prepares an optimized deployment package for AWS Lambda

set -e

echo "🚀 Building Lambda deployment package..."

# Configuration
FUNCTION_NAME="bot-scheduler-lambda"
BUILD_DIR="lambda-build"
DEPLOY_PACKAGE="lambda-deployment.zip"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Clean previous build
echo "📦 Cleaning previous build..."
rm -rf "$BUILD_DIR"
rm -f "$DEPLOY_PACKAGE"

# Create build directory
mkdir -p "$BUILD_DIR"

# Copy source files
echo "📋 Copying source files..."
cp index.js "$BUILD_DIR/"
cp package.json "$BUILD_DIR/"
cp package-lock.json "$BUILD_DIR/" 2>/dev/null || cp package.json "$BUILD_DIR/"

# Copy Prisma schema
mkdir -p "$BUILD_DIR/prisma"
cp prisma/schema.prisma "$BUILD_DIR/prisma/"

# Navigate to build directory
cd "$BUILD_DIR"

# Install production dependencies only
echo "📥 Installing production dependencies..."
npm ci --production --no-audit --no-fund

# Generate Prisma Client for Linux
echo "🔧 Generating Prisma Client for AWS Lambda (linux-musl)..."
npx prisma generate

# Remove unnecessary Prisma binaries and files
echo "🗑️  Removing unnecessary files..."

# Remove Prisma CLI (not needed at runtime)
rm -rf node_modules/prisma

# Remove unnecessary Prisma engine binaries (keep only linux-musl)
find node_modules/.prisma/client -type f \( \
    -name "libquery_engine-darwin*" \
    -o -name "libquery_engine-windows*" \
    -o -name "libquery_engine-debian*" \
    -o -name "libquery_engine-rhel*" \
    -o -name "schema-engine*" \
    -o -name "introspection-engine*" \
    -o -name "migration-engine*" \
    -o -name "prisma-fmt*" \
\) -delete 2>/dev/null || true

# Remove other unnecessary files
find node_modules -type f \( \
    -name "*.md" \
    -o -name "*.txt" \
    -o -name "*.map" \
    -o -name "LICENSE*" \
    -o -name "CHANGELOG*" \
    -o -name "*.ts" \
    -o -name "*.d.ts.map" \
\) -delete 2>/dev/null || true

# Remove common unnecessary directories
find node_modules -type d \( \
    -name "test" \
    -o -name "tests" \
    -o -name "docs" \
    -o -name "examples" \
    -o -name ".github" \
    -o -name "coverage" \
\) -exec rm -rf {} + 2>/dev/null || true

# Return to parent directory
cd ..

# Create deployment package
echo "📦 Creating deployment package..."
cd "$BUILD_DIR"
zip -r -q "../$DEPLOY_PACKAGE" .
cd ..

# Get package size
PACKAGE_SIZE=$(du -h "$DEPLOY_PACKAGE" | cut -f1)
PACKAGE_SIZE_MB=$(du -m "$DEPLOY_PACKAGE" | cut -f1)

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "📦 Package: ${YELLOW}$DEPLOY_PACKAGE${NC}"
echo -e "📏 Size: ${YELLOW}$PACKAGE_SIZE (${PACKAGE_SIZE_MB}MB)${NC}"
echo ""

# Check size and provide guidance
if [ "$PACKAGE_SIZE_MB" -lt 50 ]; then
    echo -e "${GREEN}✓ Package is under 50MB - can use direct AWS CLI deployment${NC}"
    echo "  Run: ./deploy.sh"
elif [ "$PACKAGE_SIZE_MB" -lt 250 ]; then
    echo -e "${YELLOW}⚠ Package is over 50MB - must use S3 for deployment${NC}"
    echo "  Run: ./deploy.sh --use-s3"
else
    echo -e "${YELLOW}⚠ Package is over 250MB - consider using Lambda Layers${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Configure AWS credentials if not already done"
echo "  2. Update deploy.sh with your AWS settings"
echo "  3. Run deployment script: ./deploy.sh"
