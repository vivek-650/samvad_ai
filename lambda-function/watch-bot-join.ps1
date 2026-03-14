# Real-Time Bot Join Monitor
# Run this script to watch your bot join the meeting!

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   REAL-TIME BOT MONITORING TOOL        ║" -ForegroundColor Cyan
Write-Host "║   Watching for your 5:04 PM meeting    ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝`n" -ForegroundColor Cyan

$currentTime = Get-Date
$meetingTime = Get-Date "5:04 PM"
$timeUntil = ($meetingTime - $currentTime).TotalMinutes

if ($timeUntil -gt 0) {
    Write-Host "⏰ Current time: $($currentTime.ToString('hh:mm:ss tt'))" -ForegroundColor Yellow
    Write-Host "📅 Meeting time: 5:04 PM" -ForegroundColor Yellow
    Write-Host "⏳ Time until meeting: $([math]::Round($timeUntil, 1)) minutes`n" -ForegroundColor Yellow

    if ($timeUntil -gt 5) {
        Write-Host "ℹ️  Bot will be scheduled when meeting is 0-5 minutes away" -ForegroundColor Gray
        Write-Host "   Come back in $([math]::Round($timeUntil - 5, 1)) minutes`n" -ForegroundColor Gray
    } else {
        Write-Host "🟢 SCHEDULING WINDOW ACTIVE! Bot should be scheduled now!" -ForegroundColor Green
    }
}

Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan

# Start real-time log streaming
Write-Host "📡 Starting real-time Lambda log stream..." -ForegroundColor Yellow
Write-Host "   (Press Ctrl+C to stop)`n" -ForegroundColor Gray

Write-Host "════════════════════════════════════════`n" -ForegroundColor Cyan
Write-Host "WATCH FOR THESE SUCCESS MESSAGES:`n" -ForegroundColor Green
Write-Host "  ✓ 'Retrieved X events from Google Calendar'" -ForegroundColor White
Write-Host "  ✓ 'Processing meeting: Test Bot Meeting'" -ForegroundColor White
Write-Host "  ✓ 'Found X meetings ready for bot scheduling'" -ForegroundColor White
Write-Host "  ✓ 'Bot successfully sent to MeetingBaas'" -ForegroundColor White
Write-Host "`n════════════════════════════════════════`n" -ForegroundColor Cyan

# Stream logs in real-time
& 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' logs tail `
    /aws/lambda/bot-scheduler-lambda `
    --region us-east-1 `
    --follow `
    --format short `
    --filter-pattern "Calendar Sync|Bot Scheduler|Processing meeting|✓|✗|ERROR"
