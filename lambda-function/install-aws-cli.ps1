# Install AWS CLI v2 for Windows
Write-Host "Downloading AWS CLI installer..." -ForegroundColor Cyan

$installerPath = Join-Path $env:TEMP "AWSCLIV2.msi"
$url = "https://awscli.amazonaws.com/AWSCLIV2.msi"

try {
    # Download installer
    Invoke-WebRequest -Uri $url -OutFile $installerPath -UseBasicParsing
    Write-Host "Download complete. Installing..." -ForegroundColor Green

    # Install silently
    Start-Process msiexec.exe -ArgumentList "/i `"$installerPath`" /qn /norestart" -Wait -NoNewWindow

    Write-Host "AWS CLI installed successfully!" -ForegroundColor Green
    Write-Host "Please close and reopen your terminal for changes to take effect." -ForegroundColor Yellow

    # Clean up
    Remove-Item $installerPath -ErrorAction SilentlyContinue

} catch {
    Write-Host "Error during installation: $_" -ForegroundColor Red
    exit 1
}
