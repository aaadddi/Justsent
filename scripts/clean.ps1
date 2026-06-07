# clean.ps1 - Cleanup build artifacts, dependencies, and temporary files in the repository for Windows.

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Resolve-Path "$ScriptDir\.."
Set-Location $RootDir

Write-Host "Cleaning up repository artifacts..." -ForegroundColor Cyan

# Remove Node dependencies & builds
Write-Host "Removing node_modules & dist..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\node_modules
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\dist
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\dist-ssr

# Remove Tauri build targets & resources
Write-Host "Removing Tauri targets, schemas, & resources..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\src-tauri\target
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\src-tauri\gen\schemas
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\src-tauri\resources

# Remove Go binaries
Write-Host "Removing compiled Go binaries..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue backend\bin
Remove-Item -Force -ErrorAction SilentlyContinue backend\justsent-backend*
Remove-Item -Force -ErrorAction SilentlyContinue backend\cloudflared*
Remove-Item -Force -ErrorAction SilentlyContinue scripts\justsent-backend*
Remove-Item -Force -ErrorAction SilentlyContinue scripts\cloudflared*

# Remove Logs & temporary files
Write-Host "Removing logs & caches..."
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue logs
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue backend\logs
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue desktop-app\logs
Remove-Item -Force -ErrorAction SilentlyContinue *.log
Get-ChildItem -Path . -Filter *.log -Recurse | Remove-Item -Force -ErrorAction SilentlyContinue
Remove-Item -Force -ErrorAction SilentlyContinue .eslintcache

Write-Host "Cleanup complete! Repository is in a pristine, source-only state." -ForegroundColor Green
