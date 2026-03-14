-- Quick check to see your meeting in the database
-- This will show us exactly why the bot didn't join

SELECT
    id,
    title,
    to_char(startTime AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as "Start Time (IST)",
    to_char(NOW() AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') as "Current Time (IST)",
    CASE
        WHEN startTime < NOW() THEN 'Already started ❌'
        WHEN startTime > NOW() + INTERVAL '5 minutes' THEN 'Too early (>5 min away) ⏰'
        ELSE 'Ready ✅'
    END as "Timing Status",
    CASE
        WHEN meetingUrl IS NULL THEN 'NO MEETING URL ❌'
        ELSE substring(meetingUrl from 1 for 50) || '... ✅'
    END as "Meeting URL Status",
    botScheduled as "Bot Enabled?",
    botSent as "Bot Sent?"
FROM "Meeting"
WHERE calendarEventId IS NOT NULL
  AND startTime >= NOW() - INTERVAL '2 hours'
ORDER BY startTime DESC
LIMIT 3;
