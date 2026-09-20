@echo off
chcp 65001 >nul
cd /d "%~dp0roadvision-backend"
echo ========================================================
echo  ROADVISION BACKEND - SPRING BOOT 3
echo ========================================================
if not exist "target\roadvision-backend-0.0.1-SNAPSHOT.jar" (
    echo [INFO] Dang bien dich va dong goi JAR...
    call .\mvnw.cmd package -DskipTests
)
echo [INFO] Khoi dong RoadVision Backend (Port 8080)...
java -Dfile.encoding=UTF-8 -jar target\roadvision-backend-0.0.1-SNAPSHOT.jar
pause
