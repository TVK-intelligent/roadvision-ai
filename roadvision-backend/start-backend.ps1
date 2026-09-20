[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Set-Location $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " ROADVISION BACKEND - SPRING BOOT 3" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "target\roadvision-backend-0.0.1-SNAPSHOT.jar")) {
    Write-Host "[INFO] Dang bien dich va dong goi JAR..." -ForegroundColor Yellow
    .\mvnw.cmd package -DskipTests
}

Write-Host "[INFO] Dang chay RoadVision Backend (Port 8080)..." -ForegroundColor Green
java -Dfile.encoding=UTF-8 -jar target\roadvision-backend-0.0.1-SNAPSHOT.jar
