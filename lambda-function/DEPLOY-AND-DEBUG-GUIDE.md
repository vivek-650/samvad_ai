# 🚀 Deploy & Debug Lambda Function Guide

## ✅ Your Lambda Package is Built!
- **File:** `lambda-deployment.zip` (83.8 MB)
- **Location:** `f:\Projects\Samvad AI\my-app\lambda-function\`
- **Status:** Ready to deploy with enhanced logging

---

## 📤 STEP 1: Deploy Updated Lambda Function

### Option A: AWS Console (Easiest)

1. **Go to AWS Lambda Console:**
   - Open: https://console.aws.amazon.com/lambda/home?region=us-east-1
   - Click on: **bot-scheduler-lambda**

2. **Upload New Code:**
   - Scroll down to **Code source** section
   - Click **Upload from** → **.zip file**
   - Click **Upload** button
   - Select: `f:\Projects\Samvad AI\my-app\lambda-function\lambda-deployment.zip`
   - Click **Save**

3. **Wait for deployment:**
   - You'll see "Updating function code..."
   - Wait until status shows "Update succeeded"

### Option B: AWS CLI (If installed)

```bash
cd "f:\Projects\Samvad AI\my-app\lambda-function"

aws lambda update-function-code \
  --function-name bot-scheduler-lambda \
  --zip-file fileb://lambda-deployment.zip \
  --region us-east-1
```

---

## 🔍 STEP 2: View Lambda Logs (Find the Error!)

### Method 1: AWS Console (Recommended)

1. **Go to Lambda Function:**
   - https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions/bot-scheduler-lambda

2. **Click the "Monitor" tab**

3. **Click "View logs in CloudWatch"**

4. **Click the latest Log Stream** (top of the list)

5. **Look for these patterns:**

   **✅ SUCCESS Patterns:**
   ```
   === Lambda Execution Started ===
   [Calendar Sync] ✓ Successfully synced user
   [Bot Scheduler] ✓ Bot successfully sent to MeetingBaas
   === Lambda Execution Completed Successfully ===
   ```

   **❌ ERROR Patterns to find:**
   ```
   [Calendar Sync] ✗ FAILED for user
   [Bot Scheduler] ✗ User NOT ALLOWED to schedule bot
   [Bot Scheduler] ✗ MeetingBaas API Failed
   [refreshGoogleToken] ✗ No access token in response
   Free plan - upgrade required
   Inactive subscription
   Monthly limit reached
   ```

### Method 2: AWS CLI

```bash
# Get real-time logs
aws logs tail /aws/lambda/bot-scheduler-lambda --follow --region us-east-1

# Get last 100 lines
aws logs tail /aws/lambda/bot-scheduler-lambda --region us-east-1 | tail -100

# Search for errors
aws logs tail /aws/lambda/bot-scheduler-lambda --region us-east-1 | grep "✗"
```

### Method 3: CloudWatch Log Insights

1. Go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:logs-insights

2. Select log group: `/aws/lambda/bot-scheduler-lambda`

3. Run these queries:

**Find all errors:**
```
fields @timestamp, @message
| filter @message like /ERROR|✗|FAILED/
| sort @timestamp desc
| limit 50
```

**See execution flow:**
```
fields @timestamp, @message
| filter @message like /Step|Sync|Scheduler|===|✓|✗/
| sort @timestamp desc
| limit 100
```

**Find bot scheduling attempts:**
```
fields @timestamp, @message
| filter @message like /Bot Scheduler/
| sort @timestamp desc
```

---

## 🧪 STEP 3: Test the Function Manually

### Via AWS Console:

1. Go to Lambda function page
2. Click the **"Test" tab**
3. Create test event (if not exists):
   - Event name: `test`
   - Template: `hello-world`
   - Click **Save**
4. Click **Test** button
5. Check the **Execution results** - you'll see all the logs!

### Via AWS CLI:

```bash
aws lambda invoke \
  --function-name bot-scheduler-lambda \
  --log-type Tail \
  --region us-east-1 \
  response.json

# View response
cat response.json
```

---

## 🩺 STEP 4: Check What's Wrong

### Common Issues & Solutions:

| Error Message | Meaning | Solution |
|--------------|---------|----------|
| `[Calendar Sync] ✗ FAILED` | Google Calendar token expired | Reconnect Google Calendar in your app |
| `[Bot Scheduler] Found 0 meetings` | No meetings in next 5 minutes | Schedule a test meeting |
| `Free plan - upgrade required` | User on free plan | Upgrade to starter/pro/premium |
| `Inactive subscription` | Stripe subscription not active | Check Stripe dashboard |
| `Monthly limit reached` | User hit meeting quota | Wait for billing cycle or upgrade |
| `MeetingBaas API Failed: 401` | Invalid API key | Check `MEETING_BAAS_API_KEY` env var |
| `MeetingBaas API Failed: 400` | Invalid meeting URL | Check if meeting URL is correct Google Meet link |
| `No access token in response` | Google OAuth refresh failed | Re-authenticate Google in app |
| `401 Unauthorized - disconnecting calendar` | Google rejected token | Reconnect Google Calendar |

---

## 📊 STEP 5: Check Database Status

Run this query in your database to see user status:

```sql
SELECT
    clerkId,
    name,
    email,
    currentPlan,
    subscriptionStatus,
    meetingsThisMonth,
    calendarConnected,
    googleTokenExpiry,
    botName
FROM "User"
WHERE calendarConnected = true
ORDER BY googleTokenExpiry ASC;
```

**Check:**
- ✅ `currentPlan` should NOT be "free"
- ✅ `subscriptionStatus` should be "active"
- ✅ `calendarConnected` should be `true`
- ✅ `googleTokenExpiry` should be in the FUTURE
- ✅ `meetingsThisMonth` < plan limit

---

## 📅 Check Upcoming Meetings

```sql
SELECT
    id,
    title,
    startTime,
    meetingUrl,
    botScheduled,
    botSent,
    botId,
    "userId"
FROM "Meeting"
WHERE startTime >= NOW()
  AND startTime <= NOW() + INTERVAL '1 day'
  AND botScheduled = true
ORDER BY startTime ASC;
```

**What to look for:**
- ✅ `botScheduled` = true
- ✅ `botSent` = false (if not sent yet)
- ✅ `meetingUrl` has valid Google Meet link
- ✅ `startTime` is within next 5 minutes (Lambda looks for meetings in 5-minute window)

---

## 🎯 MOST LIKELY ISSUES (Based on Your Screenshots)

You saw "ERROR calendar er..." with 3 failed invocations. This means:

### **1. Google Calendar Token Expired (Most Common)**

**Symptoms:**
- Logs show: `[syncUserCalendar] ✗ CRITICAL ERROR`
- Logs show: `401 Unauthorized - disconnecting calendar`

**Solution:**
1. Go to your app: Dashboard → Integrations
2. Click "Reconnect Google Calendar"
3. Re-authorize Google access

### **2. User on Free Plan**

**Symptoms:**
- Logs show: `Free plan - upgrade required`

**Solution:**
1. Upgrade user to starter/pro plan
2. Or manually set in database:
```sql
UPDATE "User"
SET currentPlan = 'starter',
    subscriptionStatus = 'active'
WHERE clerkId = 'YOUR_CLERK_ID';
```

### **3. No Meetings in 5-Minute Window**

**Symptoms:**
- Logs show: `[Bot Scheduler] Found 0 meetings ready for bot scheduling`

**Solution:**
- Lambda only checks for meetings starting in next 0-5 minutes
- Schedule a test meeting that starts in 2-3 minutes
- Wait for Lambda to run (it runs every 1-2 minutes via EventBridge)

---

## 🔄 STEP 6: Monitor in Real-Time

### Set up CloudWatch Dashboard:

1. Go to: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards

2. Create dashboard: `lambda-bot-scheduler-monitoring`

3. Add widgets:
   - **Invocations** (select Lambda → bot-scheduler-lambda → Invocations)
   - **Errors** (select Lambda → bot-scheduler-lambda → Errors)
   - **Duration** (select Lambda → bot-scheduler-lambda → Duration)

4. Add **Log Insights** widget with query:
   ```
   fields @timestamp, @message
   | filter @message like /✓|✗/
   | sort @timestamp desc
   | limit 20
   ```

---

## 📝 Quick Reference Commands

```bash
# View logs
aws logs tail /aws/lambda/bot-scheduler-lambda --follow --region us-east-1

# Test manually
aws lambda invoke --function-name bot-scheduler-lambda --region us-east-1 response.json

# Check function status
aws lambda get-function --function-name bot-scheduler-lambda --region us-east-1

# View environment variables
aws lambda get-function-configuration --function-name bot-scheduler-lambda --region us-east-1
```

---

## ✅ Summary of What You Need to Do Right Now:

1. **Deploy updated Lambda function** (via AWS Console - upload zip)
2. **Open CloudWatch Logs** (Lambda → Monitor → View logs)
3. **Look for error messages** with ✗ or ERROR
4. **Check if user has active subscription and calendar connected**
5. **Schedule a test meeting in 2-3 minutes**
6. **Watch logs in real-time** as Lambda executes
7. **Share the error logs** with me and I'll help fix it!

---

## 🆘 Need Help?

After deploying and checking logs, share:
1. Screenshot/text of CloudWatch logs (especially errors)
2. Your current plan status (free/starter/pro)
3. Whether Google Calendar is connected
4. Details of the meeting (start time, URL)

I'll help you fix it immediately! 🚀
