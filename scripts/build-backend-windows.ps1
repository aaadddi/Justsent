# Windows Go backend build script
$ErrorActionPreference = "Stop"

# Target architecture (default to amd64)
$Arch = "amd64"
if ($args.Count -ge 1) {
    $Arch = $args[0]
}

if ($Arch -eq "arm64" -or $Arch -eq "aarch64") {
    $env:GOARCH = "arm64"
    $CloudflaredArch = "arm64"
} else {
    $env:GOARCH = "amd64"
    $CloudflaredArch = "amd64"
}

$ResourcesDir = "desktop-app\src-tauri\resources"
if (!(Test-Path $ResourcesDir)) {
    New-Item -ItemType Directory -Force -Path $ResourcesDir | Out-Null
}

Write-Output "Building Go backend for Windows ($env:GOARCH)..."
$Version = "0.1.0"
try {
    $Version = (git describe --tags --always)
} catch {}

$Commit = "unknown"
try {
    $Commit = (git rev-parse --short HEAD)
} catch {}

$BuildTime = (Get-Date -UFormat "%Y-%m-%dT%H:%M:%SZ")
$LdFlags = "-X main.Version=$Version -X main.Commit=$Commit -X main.BuildTime=$BuildTime"

$env:GOOS = "windows"
cd backend
go build -ldflags "$LdFlags" -o "..\$ResourcesDir\justsent-backend.exe" ./cmd/justsent
cd ..

# Copy config template
$ConfigDir = "$ResourcesDir\config"
if (!(Test-Path $ConfigDir)) {
    New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
}

if (Test-Path "backend\config.json") {
    Copy-Item "backend\config.json" "$ConfigDir\config.json" -Force
} else {
    $DefaultConfig = @{
        version = 1
        server_port = "8787"
        server_host = "localhost"
        secret_key = "HeHeHe"
    } | ConvertTo-Json
    Set-Content -Path "$ConfigDir\config.json" -Value $DefaultConfig -Force
}

# Fetch cloudflared
$CloudflaredBin = "$ResourcesDir\cloudflared.exe"
if (!(Test-Path $CloudflaredBin)) {
    Write-Output "cloudflared binary not found. Downloading for Windows $CloudflaredArch..."
    $Url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-$CloudflaredArch.exe"
    Write-Output "Downloading from $Url..."
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $Url -OutFile $CloudflaredBin
}

Write-Output "Windows Backend build completed successfully."
