# Test Bot Scheduling - Complete Diagnostic
# This script helps you verify and test the bot scheduling system

Write-Host "`n===========================================`n" -ForegroundColor Cyan
Write-Host "   BOT SCHEDULING DIAGNOSTIC TOOL" -ForegroundColor Cyan
Write-Host "`n===========================================`n" -ForegroundColor Cyan

# Step 1: Invoke Lambda
Write-Host "[1/3] Invoking Lambda function..." -ForegroundColor Yellow
& 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' lambda invoke `
    --function-name bot-scheduler-lambda `
    --region us-east-1 `
    response.json | Out-Null

Write-Host "      Lambda invoked successfully!`n" -ForegroundColor Green

# Step 2: Get and display logs
Write-Host "[2/3] Fetching execution logs...`n" -ForegroundColor Yellow

$logOutput = & 'C:\Program Files\Amazon\AWSCLIV2\aws.exe' logs tail `
    /aws/lambda/bot-scheduler-lambda `
    --region us-east-1 `
    --since 1m `
    --format short 2>&1

# Parse and display key metrics
Write-Host "=== CALENDAR SYNC RESULTS ===" -ForegroundColor Cyan
$logOutput | Select-String "Calendar Sync.*Found|Retrieved.*events|existing meetings" | ForEach-Object {
    Write-Host "  $_" -ForegroundColor White
}

Write-Host "`n=== BOT SCHEDULING RESULTS ===" -ForegroundColor Cyan
$logOutput | Select-String "Bot Scheduler.*Looking|Bot Scheduler.*Found" | ForEach-Object {
    Write-Host "  $_" -ForegroundColor White
}

Write-Host "`n=== CANCELLED/PROCESSED EVENTS ===" -ForegroundColor Cyan
$logOutput | Select-String "cancelled event:|Processing meeting" | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Gray
}

Write-Host "`n=== ANY ERRORS ===" -ForegroundColor Red
$errors = $logOutput | Select-String "ERROR|FAILED|" | Select-Object -First 5
if ($errors) {
    $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
} else {
    Write-Host "  No errors found!" -ForegroundColor Green
}

# Step 3: Show next steps
Write-Host "`n[3/3] DIAGNOSIS & NEXT STEPS:`n" -ForegroundColor Yellow

$foundMeetings = ($logOutput | Select-String "Bot Scheduler.*Found (\d+)" | Select-Object -Last 1).Matches.Groups[1].Value

if ($foundMeetings -eq "0") {
    Write-Host "  STATUS: No meetings ready for bot scheduling" -ForegroundColor Red
    Write-Host "`n  LIKELY REASONS:" -ForegroundColor Yellow
    Write-Host "    1. All your Google Calendar events are CANCELLED" -ForegroundColor Gray
    Write-Host "    2. No meetings are starting in the next 0-5 minutes" -ForegroundColor Gray
    Write-Host "    3. You haven't created any Google Meet events yet" -ForegroundColor Gray

    Write-Host "`n  TO FIX - Create a test meeting:" -ForegroundColor Green
    Write-Host "    1. Open Google Calendar: https://calendar.google.com" -ForegroundColor White
    Write-Host "    2. Click 'Create' button" -ForegroundColor White
    Write-Host "    3. Set title: Test Bot Meeting" -ForegroundColor White

    $testTime = (Get-Date).AddMinutes(3).ToString("hh:mm tt")
    Write-Host "    4. Set time to: $testTime (3 minutes from now)" -ForegroundColor White
    Write-Host "    5. Click 'Add Google Meet video conferencing'" -ForegroundColor White
    Write-Host "    6. Click 'Save'" -ForegroundColor White
    Write-Host "    7. Wait 1-2 minutes for Lambda to sync" -ForegroundColor White
    Write-Host "    8. Run this script again!" -ForegroundColor White
} else {
    Write-Host "  STATUS: Found $foundMeetings meeting(s) ready!" -ForegroundColor Green
    Write-Host "  The bot should join within the next minute!" -ForegroundColor Green
}

Write-Host "`n===========================================`n" -ForegroundColor Cyan
Write-Host "For detailed logs, visit:" -ForegroundColor Yellow
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/`$252Faws`$252Flambda`$252Fbot-scheduler-lambda`n" -ForegroundColor Cyan
