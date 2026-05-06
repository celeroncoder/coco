$ErrorActionPreference = "Stop"

$ARCH = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
$BINARY = "coco-agent-windows-${ARCH}.exe"
$REPO = "celeroncoder/coco"

Write-Host "Fetching latest coco-agent release..."
$TAG = (Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest").tag_name

if (-not $TAG) {
  Write-Error "Failed to determine latest release tag."
  exit 1
}

Write-Host "Downloading coco-agent $TAG for windows-${ARCH}..."

$INSTALL_DIR = if ($env:COCO_INSTALL_DIR) { $env:COCO_INSTALL_DIR } else { "$env:USERPROFILE\.coco\bin" }
New-Item -ItemType Directory -Force -Path $INSTALL_DIR | Out-Null

$DOWNLOAD_URL = "https://github.com/$REPO/releases/download/$TAG/$BINARY"
Invoke-WebRequest -Uri $DOWNLOAD_URL -OutFile "$INSTALL_DIR\coco-agent.exe"

Write-Host ""
Write-Host "coco-agent installed to $INSTALL_DIR\coco-agent.exe"

if ($env:PATH -split ';' -notcontains $INSTALL_DIR) {
  Write-Host ""
  Write-Host "To add $INSTALL_DIR to your PATH, run this in an elevated PowerShell:"
  Write-Host "  [Environment]::SetEnvironmentVariable('PATH', `$env:PATH + ';$INSTALL_DIR', [EnvironmentVariableTarget]::User)"
  Write-Host "Then restart your terminal."
}

Write-Host ""
Write-Host "Run 'coco-agent start' to begin."
