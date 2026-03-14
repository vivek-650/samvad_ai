param(
    [string]$FunctionName = "bot-scheduler-lambda",
    [string]$Region = "us-east-1",
    [int]$WatchMinutes = 10,
    [int]$PollSeconds = 30
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if ($WatchMinutes -lt 1) {
    Write-Host "WatchMinutes must be >= 1" -ForegroundColor Red
    exit 1
}

if ($PollSeconds -lt 5) {
    Write-Host "PollSeconds must be >= 5" -ForegroundColor Red
    exit 1
}

$responseFile = Join-Path $PSScriptRoot "response.json"
$logGroup = "/aws/lambda/$FunctionName"

$nowUtc = (Get-Date).ToUniversalTime()
$nowIst = $nowUtc.AddHours(5).AddMinutes(30)

Write-Host "=== Bot Scheduler Quick Validation ===" -ForegroundColor Cyan
Write-Host "Function: $FunctionName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Now (UTC): $($nowUtc.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
Write-Host "Now (IST): $($nowIst.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Cyan
Write-Host "Watch window: $WatchMinutes minutes (poll every $PollSeconds sec)" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1/3: Manual invoke..." -ForegroundColor Yellow
$invokeRaw = aws lambda invoke `
    --function-name $FunctionName `
    --region $Region `
    $responseFile `
    --output json 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "Lambda invoke failed:" -ForegroundColor Red
    Write-Host $invokeRaw
    exit 1
}

Write-Host "Invoke accepted." -ForegroundColor Green
if (Test-Path $responseFile) {
    Write-Host "Response payload:" -ForegroundColor Yellow
    Get-Content $responseFile
}
Write-Host ""

Write-Host "Step 2/3: Polling CloudWatch logs..." -ForegroundColor Yellow
$watchEndUtc = (Get-Date).ToUniversalTime().AddMinutes($WatchMinutes)
$cursorMs = [DateTimeOffset]::UtcNow.AddMinutes(-1).ToUnixTimeMilliseconds()
$seenEventIds = New-Object 'System.Collections.Generic.HashSet[string]'

$matchedAny = $false
$foundReady = $false
$dispatchSuccess = $false
$foundError = $false

while ((Get-Date).ToUniversalTime() -lt $watchEndUtc) {
    $raw = aws logs filter-log-events `
        --log-group-name $logGroup `
        --start-time $cursorMs `
        --region $Region `
        --output json 2>$null

    if ($LASTEXITCODE -eq 0 -and $raw) {
        $data = $raw | ConvertFrom-Json

        if ($data.events) {
            foreach ($ev in ($data.events | Sort-Object timestamp)) {
                if (-not $seenEventIds.Add($ev.eventId)) {
                    continue
                }

                $eventTs = [int64]$ev.timestamp
                if ($eventTs -ge $cursorMs) {
                    $cursorMs = $eventTs + 1
                }

                $msg = ($ev.message -replace "`r", " " -replace "`n", " ").Trim()
                if (-not $msg) {
                    continue
                }

                $isRelevant = $msg -match "Bot Scheduler|MeetingBaas|Lambda Execution|Found [0-9]+ meetings|error|Error|failed|Failed"
                if (-not $isRelevant) {
                    continue
                }

                $matchedAny = $true
                if ($msg -match "Found [1-9][0-9]* meetings ready") {
                    $foundReady = $true
                }
                if ($msg -match "successfully sent to MeetingBaas") {
                    $dispatchSuccess = $true
                }
                if ($msg -match "error|Error|failed|Failed") {
                    $foundError = $true
                }

                $utc = [DateTimeOffset]::FromUnixTimeMilliseconds($eventTs).UtcDateTime
                $ist = $utc.AddHours(5).AddMinutes(30)
                Write-Host "[$($ist.ToString('HH:mm:ss')) IST] $msg"
            }
        }
    }

    Start-Sleep -Seconds $PollSeconds
}

Write-Host ""
Write-Host "Step 3/3: Summary" -ForegroundColor Yellow
if ($dispatchSuccess) {
    Write-Host "PASS: Bot dispatch reached MeetingBaas." -ForegroundColor Green
    exit 0
}

if ($foundReady -and -not $dispatchSuccess) {
    Write-Host "WARN: Meeting was ready, but no successful MeetingBaas dispatch was logged." -ForegroundColor Yellow
    exit 2
}

if ($foundError) {
    Write-Host "FAIL: Error lines were detected in scheduler logs." -ForegroundColor Red
    exit 3
}

if (-not $matchedAny) {
    Write-Host "WARN: No relevant scheduler lines appeared during watch window." -ForegroundColor Yellow
    exit 4
}

Write-Host "INFO: Scheduler ran but did not find a ready meeting in this window." -ForegroundColor Yellow
exit 5
