# Bot Scheduler Lambda Function

AWS Lambda function for scheduling meeting bots and syncing Google Calendar events.

## 📋 Prerequisites

- Node.js 20.x
- AWS CLI configured with appropriate credentials
- AWS IAM Role with Lambda execution permissions
- PostgreSQL database (for Prisma)
- Google OAuth credentials
- MeetingBaas API key

## 🏗️ Architecture

```
lambda-function/
├── index.js              # Main Lambda handler
├── prisma/
│   └── schema.prisma     # Database schema
├── package.json          # Dependencies
├── build.sh              # Build script (Linux/Mac)
├── build.ps1             # Build script (Windows)
├── deploy.sh             # Deployment script (Linux/Mac)
├── deploy.ps1            # Deployment script (Windows)
└── .env.example          # Environment variables template
```

## 🚀 Quick Start

### Step 1: Configure Deployment

Edit `deploy.ps1` (Windows) or `deploy.sh` (Linux/Mac) and update:

```powershell
# Required configurations
$FUNCTION_NAME = "bot-scheduler-lambda"
$ROLE_ARN = "arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE"
$REGION = "us-east-1"

# S3 bucket (if using S3 deployment)
$S3_BUCKET = "your-lambda-deployment-bucket"

# Environment variables
$ENV_VARS = @"
{
    "DATABASE_URL": "postgresql://...",
    "GOOGLE_CLIENT_ID": "...",
    "GOOGLE_CLIENT_SECRET": "...",
    "MEETING_BAAS_API_KEY": "...",
    "WEBHOOK_URL": "https://..."
}
"@
```

### Step 2: Build the Package

**Windows (PowerShell):**

```powershell
.\build.ps1
```

**Linux/Mac/WSL:**

```bash
chmod +x build.sh
./build.sh
```

This will:

- Install production dependencies
- Generate Prisma Client for AWS Lambda (linux-musl)
- Remove unnecessary files
- Create an optimized `lambda-deployment.zip`

### Step 3: Deploy to AWS

**Windows (PowerShell):**

```powershell
# Direct upload (if < 50MB)
.\deploy.ps1

# Or use S3 (if >= 50MB or preferred)
.\deploy.ps1 -UseS3
```

**Linux/Mac/WSL:**

```bash
chmod +x deploy.sh

# Direct upload (if < 50MB)
./deploy.sh

# Or use S3 (if >= 50MB or preferred)
./deploy.sh --use-s3
```

### Step 4: Set Up EventBridge Trigger

Create an EventBridge rule to trigger this Lambda every 5 minutes:

```bash
# Create rule
aws events put-rule \
  --name bot-scheduler-trigger \
  --schedule-expression "rate(5 minutes)" \
  --region us-east-1

# Add Lambda permission
aws lambda add-permission \
  --function-name bot-scheduler-lambda \
  --statement-id bot-scheduler-eventbridge \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/bot-scheduler-trigger \
  --region us-east-1

# Add target
aws events put-targets \
  --rule bot-scheduler-trigger \
  --targets "Id"="1","Arn"="arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:bot-scheduler-lambda" \
  --region us-east-1
```

## 🔐 IAM Role Requirements

Your Lambda execution role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

Additionally, if using VPC (for database access):

- `ec2:CreateNetworkInterface`
- `ec2:DescribeNetworkInterfaces`
- `ec2:DeleteNetworkInterface`

## 📦 Package Size Optimization

The build script automatically:

- Removes dev dependencies
- Keeps only `linux-musl` Prisma binary
- Removes unnecessary files (tests, docs, etc.)
- Removes Prisma CLI (not needed at runtime)

Expected package size: **20-50 MB**

## ⚠️ Important Notes

### AWS Console Code Editor

**The Lambda code will NOT be visible in the AWS Console code editor** because the deployment package is larger than 3MB. This is normal and expected for Prisma-based functions.

You can still:

- View function configuration in the console
- Monitor CloudWatch logs
- Test the function
- Update via AWS CLI

### Database Connection

For PostgreSQL databases, use connection pooling:

```
DATABASE_URL=postgresql://user:pass@host:5432/db?schema=public&connection_limit=1
```

The `connection_limit=1` is important for Lambda to prevent connection exhaustion.

### Prisma Binary

The `schema.prisma` is already configured with:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["linux-musl"]  // For AWS Lambda
}
```

## 🧪 Testing

Test the deployed function:

```bash
aws lambda invoke \
  --function-name bot-scheduler-lambda \
  --region us-east-1 \
  response.json

cat response.json
```

View logs:

```bash
aws logs tail /aws/lambda/bot-scheduler-lambda --follow --region us-east-1
```

## 🔄 Update Workflow

When making code changes:

1. Make your changes to `index.js` or Prisma schema
2. Rebuild: `.\build.ps1` or `./build.sh`
3. Redeploy: `.\deploy.ps1` or `./deploy.sh`

## 📊 Monitoring

View function metrics in CloudWatch:

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#metricsV2:graph=~()
```

Key metrics to monitor:

- Invocations
- Duration
- Errors
- Throttles
- Concurrent executions

## 🐛 Troubleshooting

### Package too large

If package exceeds 250MB:

- Consider using Lambda Layers for Prisma
- Check for unnecessary dependencies in `package.json`

### Prisma connection errors

- Verify `DATABASE_URL` environment variable
- Check VPC configuration if database is in private subnet
- Ensure security groups allow Lambda access

### Function timeout

- Default timeout is 300s (5 minutes)
- Increase if needed: update `$TIMEOUT` in deploy script

## 📚 Resources

- [AWS Lambda Limits](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html)
- [Prisma in AWS Lambda](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-aws-lambda)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)

## 🤝 Support

For issues related to:

- Build errors: Check Node.js version (should be 20.x)
- Deployment errors: Verify AWS credentials and IAM permissions
- Runtime errors: Check CloudWatch logs
