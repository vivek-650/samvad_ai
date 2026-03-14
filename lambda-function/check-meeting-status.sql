-- Check the meeting that was just created from Google Calendar
-- Run this in your database to see why bot isn't being scheduled

SELECT
    id,
    title,
    startTime,
    endTime,
    meetingUrl,
    botScheduled,
    botSent,
    isFromCalendar,
    userId,
    CASE
        WHEN meetingUrl IS NULL THEN '❌ NO MEETING URL - Bot cannot join'
        WHEN NOT botScheduled THEN '❌ Bot scheduling is OFF'
        WHEN botSent THEN '❌ Bot already sent'
        WHEN startTime < NOW() THEN '❌ Meeting already started'
        WHEN startTime > NOW() + INTERVAL '5 minutes' THEN '⏰ Too early - meeting more than 5 min away'
        ELSE '✅ Ready for bot!'
    END as status
FROM "Meeting"
WHERE isFromCalendar = true
  AND startTime >= NOW() - INTERVAL '1 hour'
ORDER BY startTime ASC
LIMIT 5;
