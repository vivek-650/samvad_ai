# Lambda Chat Reset - Deployment Summary

## 🎯 Function Purpose

Resets the `chatMessagesToday` counter for all active subscription users daily at midnight UTC.

## ✅ Deployment Details

**Function Name:** `chat-reset-lambda`
**Runtime:** Node.js 20.x
**Timeout:** 30 seconds
**Memory:** 512 MB
**Package Size:** 82.85 MB

**Function ARN:**

```
arn:aws:lambda:us-east-1:793523167017:function:chat-reset-lambda
```

**AWS Console URL:**

```
https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/chat-reset-lambda
```

## ⏰ Schedule

**EventBridge Rule:** `chat-reset-daily-trigger`
**Schedule:** Daily at midnight UTC (00:00 UTC)
**Cron Expression:** `cron(0 0 * * ? *)`

## 🧪 Test Results

```json
{
  "statusCode": 200,
  "body": {
    "message": "daily chat reset completed successfully",
    "usersReset": 1,
    "timestamp": "2026-03-14T01:32:29.050Z"
  }
}
```

✅ **Function tested successfully** - Database connection working!

## 📊 What This Function Does

1. Connects to the database using Prisma
2. Finds all users with `subscriptionStatus: 'active'`
3. Resets their `chatMessagesToday` counter to 0
4. Returns the count of users reset
5. Runs automatically every day at midnight UTC

## 🔐 Environment Variables

- `DATABASE_URL`: PostgreSQL connection string with connection pooling

## 📂 Files Created

```
lambda-chat/
├── lambda-chat-reset.js          # Main handler (source)
├── build-and-upload.ps1          # Build and upload script
├── package.json                  # Dependencies
└── prisma/
    └── schema.prisma             # Updated with correct binaries
```

## 🔄 To Update Function

```powershell
cd "f:\Projects\Samvad AI\my-app\lambda-chat"

# Edit lambda-chat-reset.js with your changes

# Rebuild and upload
.\build-and-upload.ps1

# Update Lambda
aws lambda update-function-code \
  --function-name chat-reset-lambda \
  --s3-bucket samvad-ai-lambda-deployments \
  --s3-key lambda-chat/lambda-deployment.zip \
  --region us-east-1
```

## 📊 Monitoring

**View Logs:**

```bash
aws logs tail /aws/lambda/chat-reset-lambda --follow --region us-east-1
```

**CloudWatch Logs:**

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fchat-reset-lambda
```

## 💰 Cost Estimate

- **Invocations**: 1/day = ~30/month
- **Compute**: ~1-2 seconds per execution
- **Estimated Total**: **< $0.10/month** (well within free tier)

## ⚠️ Important Notes

- Function runs at **midnight UTC** (not local time)
- Only resets users with **active subscriptions**
- Uses connection pooling (`connection_limit=1`)
- Package is too large for inline console editing (this is normal)

## 🎉 Deployment Status

✅ Function deployed successfully
✅ EventBridge trigger configured
✅ Database connection verified
✅ Test execution successful
✅ Prisma binaries correct for Lambda

**Next execution:** Tomorrow at 00:00 UTC
