# AWS Lambda Deployment - Quick Setup Guide

This guide helps you deploy your Lambda function in production.

## Prerequisites Checklist

- [ ] AWS Account with appropriate permissions
- [ ] AWS CLI installed and configured
- [ ] Node.js 20.x installed
- [ ] Database URL ready
- [ ] Google OAuth credentials
- [ ] MeetingBaas API key

## Step-by-Step Setup

### 1. Install AWS CLI (if not already installed)

**Windows:**
Download from: https://aws.amazon.com/cli/

**Mac:**

```bash
brew install awscli
```

**Linux:**

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2. Configure AWS Credentials

Run:

```bash
aws configure
```

Enter:

- AWS Access Key ID: [Your Access Key]
- AWS Secret Access Key: [Your Secret Key]
- Default region: us-east-1 (or your preferred region)
- Default output format: json

### 3. Create IAM Role for Lambda

Create a file `lambda-trust-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:

```bash
aws iam create-role \
  --role-name bot-scheduler-lambda-role \
  --assume-role-policy-document file://lambda-trust-policy.json
```

Attach basic execution policy:

```bash
aws iam attach-role-policy \
  --role-name bot-scheduler-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

**Note the Role ARN** from the output - you'll need it for deployment.

### 4. Create S3 Bucket (Optional - for large deployments)

If your package is over 50MB:

```bash
aws s3 mb s3://your-lambda-deployment-bucket --region us-east-1
```

### 5. Configure Deployment Script

Edit `deploy.ps1` (Windows) or `deploy.sh` (Linux):

Update these values:

```powershell
$ROLE_ARN = "arn:aws:iam::123456789012:role/bot-scheduler-lambda-role"  # From step 3
$REGION = "us-east-1"  # Your region
$S3_BUCKET = "your-lambda-deployment-bucket"  # From step 4 (if using S3)

# Update environment variables
$ENV_VARS = @"
{
    "DATABASE_URL": "postgresql://user:pass@host:5432/db?schema=public&connection_limit=1",
    "GOOGLE_CLIENT_ID": "your-google-client-id.apps.googleusercontent.com",
    "GOOGLE_CLIENT_SECRET": "your-google-client-secret",
    "MEETING_BAAS_API_KEY": "your-meeting-baas-api-key",
    "WEBHOOK_URL": "https://your-domain.com/api/webhooks/meetingbaas"
}
"@
```

### 6. Build and Deploy

**Windows (PowerShell - Run as Administrator):**

```powershell
# Set execution policy (first time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Build and deploy
.\build-and-deploy.ps1

# Or if package is large
.\build-and-deploy.ps1 -UseS3
```

**Linux/Mac/WSL:**

```bash
# Make scripts executable
chmod +x *.sh

# Build and deploy
./build-and-deploy.sh

# Or if package is large
./build-and-deploy.sh --use-s3
```

### 7. Set Up EventBridge Trigger (Scheduler)

Create a rule to run the Lambda every 5 minutes:

```bash
# Get your AWS account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-east-1"

# Create EventBridge rule
aws events put-rule \
  --name bot-scheduler-trigger \
  --schedule-expression "rate(5 minutes)" \
  --region $REGION

# Add permission to Lambda
aws lambda add-permission \
  --function-name bot-scheduler-lambda \
  --statement-id bot-scheduler-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:$REGION:$ACCOUNT_ID:rule/bot-scheduler-trigger \
  --region $REGION

# Connect EventBridge to Lambda
aws events put-targets \
  --rule bot-scheduler-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:bot-scheduler-lambda" \
  --region $REGION
```

### 8. Test the Function

```bash
# Invoke the function manually
aws lambda invoke \
  --function-name bot-scheduler-lambda \
  --region us-east-1 \
  response.json

# View the response
cat response.json  # Linux/Mac
Get-Content response.json  # Windows
```

### 9. Monitor Logs

View real-time logs:

```bash
aws logs tail /aws/lambda/bot-scheduler-lambda --follow --region us-east-1
```

## Understanding AWS Console Limitations

⚠️ **Important:** Your Lambda function uses Prisma, which makes the deployment package large (20-50 MB).

This means:

- ✅ Function will deploy and run successfully
- ✅ You can view logs, metrics, and configuration in AWS Console
- ❌ You CANNOT edit code inline in the AWS Console (package too large)

This is **normal and expected** for production Lambda functions with dependencies.

## Troubleshooting

### "An error occurred (AccessDeniedException)"

- Check your AWS credentials: `aws sts get-caller-identity`
- Ensure IAM user has Lambda permissions

### "Role ARN is not valid"

- Verify the role ARN in deploy script
- Ensure role has Lambda trust policy

### Package size > 250MB

- Check dependencies in `package.json`
- Consider moving Prisma to a Lambda Layer

### Database connection errors

- Verify DATABASE_URL environment variable
- Check database security group allows Lambda IP ranges
- Use connection pooling: `?connection_limit=1`

### Function timeout

- Increase timeout in deploy script: `$TIMEOUT = 600`
- Monitor execution time in CloudWatch

## Quick Commands Reference

```bash
# Build only
.\build.ps1  # Windows
./build.sh   # Linux

# Deploy only
.\deploy.ps1  # Windows
./deploy.sh   # Linux

# Build + Deploy
.\build-and-deploy.ps1  # Windows
./build-and-deploy.sh   # Linux

# View logs
aws logs tail /aws/lambda/bot-scheduler-lambda --follow

# Test function
aws lambda invoke --function-name bot-scheduler-lambda response.json

# Update environment variables only
aws lambda update-function-configuration \
  --function-name bot-scheduler-lambda \
  --environment Variables="{DATABASE_URL=postgresql://...}"
```

## Next Steps

1. ✅ Deploy the function
2. ✅ Set up EventBridge trigger
3. ✅ Test the function
4. ✅ Monitor logs for the first few runs
5. ✅ Verify calendar sync is working
6. ✅ Verify bot scheduling is working

## Getting Help

- AWS Lambda docs: https://docs.aws.amazon.com/lambda/
- Prisma in Lambda: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda
- Check CloudWatch logs for errors
