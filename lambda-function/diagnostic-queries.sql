-- Quick diagnostic queries for bot scheduling issues
-- Run these in your database to find the problem

-- 1. Check user subscription status
SELECT
    clerkId,
    name AS "User Name",
    email,
    currentPlan AS "Plan",
    subscriptionStatus AS "Sub Status",
    meetingsThisMonth AS "Meetings Used",
    calendarConnected AS "Calendar OK?",
    googleTokenExpiry AS "Token Expires",
    CASE
        WHEN googleTokenExpiry < NOW() THEN '❌ EXPIRED'
        WHEN googleTokenExpiry < NOW() + INTERVAL '1 day' THEN '⚠️ EXPIRING SOON'
        ELSE '✅ OK'
    END AS "Token Status"
FROM "User"
WHERE calendarConnected = true
ORDER BY googleTokenExpiry ASC;

-- 2. Check upcoming meetings (next 24 hours)
SELECT
    m.id,
    m.title AS "Meeting",
    m.startTime AS "Start Time",
    CASE
        WHEN m.startTime <= NOW() THEN '❌ PAST'
        WHEN m.startTime <= NOW() + INTERVAL '5 minutes' THEN '🟢 NOW (Lambda will pick up!)'
        WHEN m.startTime <= NOW() + INTERVAL '1 hour' THEN '🟡 SOON'
        ELSE '⏰ LATER'
    END AS "Status",
    m.meetingUrl AS "URL",
    m.botScheduled AS "Bot Enabled?",
    m.botSent AS "Already Sent?",
    m.botId AS "Bot ID",
    u.clerkId AS "User",
    u.currentPlan AS "Plan"
FROM "Meeting" m
JOIN "User" u ON m.userId = u.id
WHERE m.startTime >= NOW()
  AND m.startTime <= NOW() + INTERVAL '24 hours'
  AND m.botScheduled = true
ORDER BY m.startTime ASC;

-- 3. Find meetings that should have gotten bots but didn't
SELECT
    m.id,
    m.title,
    m.startTime,
    m.botScheduled AS "Should Have Bot",
    m.botSent AS "Bot Was Sent?",
    u.currentPlan,
    u.subscriptionStatus,
    u.calendarConnected,
    CASE
        WHEN u.currentPlan = 'free' THEN '❌ Free plan - no bots'
        WHEN u.subscriptionStatus != 'active' THEN '❌ Inactive subscription'
        WHEN NOT u.calendarConnected THEN '❌ Calendar not connected'
        WHEN m.meetingUrl IS NULL THEN '❌ No meeting URL'
        WHEN u.googleTokenExpiry < NOW() THEN '❌ Google token expired'
        ELSE '✅ Should work'
    END AS "Issue"
FROM "Meeting" m
JOIN "User" u ON m.userId = u.id
WHERE m.startTime >= NOW() - INTERVAL '2 hours'
  AND m.startTime <= NOW() + INTERVAL '24 hours'
  AND m.botScheduled = true
  AND m.botSent = false
ORDER BY m.startTime ASC;

-- 4. Check recent bot activity (last 24 hours)
SELECT
    m.title,
    m.startTime,
    m.botSent,
    m.botJoinedAt,
    m.botId,
    u.clerkId,
    u.currentPlan
FROM "Meeting" m
JOIN "User" u ON m.userId = u.id
WHERE m.botJoinedAt >= NOW() - INTERVAL '24 hours'
   OR (m.startTime >= NOW() - INTERVAL '24 hours' AND m.botScheduled = true)
ORDER BY m.startTime DESC;

-- 5. Find problematic users (expired tokens, free plan, etc.)
SELECT
    clerkId,
    name,
    currentPlan,
    subscriptionStatus,
    calendarConnected,
    googleTokenExpiry,
    meetingsThisMonth,
    CASE
        WHEN currentPlan = 'free' THEN '❌ On free plan (no bots allowed)'
        WHEN subscriptionStatus != 'active' THEN '❌ Subscription not active'
        WHEN NOT calendarConnected THEN '⚠️ Calendar not connected'
        WHEN googleTokenExpiry < NOW() THEN '❌ Token expired - needs reconnect'
        WHEN meetingsThisMonth >= 10 AND currentPlan = 'starter' THEN '❌ Monthly limit reached'
        WHEN meetingsThisMonth >= 30 AND currentPlan = 'pro' THEN '❌ Monthly limit reached'
        ELSE '✅ All good'
    END AS "Status"
FROM "User"
WHERE calendarConnected = true
   OR currentPlan != 'free'
ORDER BY
    CASE
        WHEN currentPlan = 'free' THEN 1
        WHEN subscriptionStatus != 'active' THEN 2
        WHEN googleTokenExpiry < NOW() THEN 3
        ELSE 4
    END;
