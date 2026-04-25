@echo off
TITLE KidTrend Radar Launcher
echo Starting KidTrend Radar Applications...

cd /d "c:\dev\github\personal\KidTrendRadar"

:: Start the API Server in a new window
start "KidTrend API" cmd /c "npm run dev:api"
timeout /t 3 /nobreak >nul

:: Start the Desktop UI and expo in new windows
start "KidTrend Desktop" cmd /c "npm run dev:desktop"
timeout /t 3 /nobreak >nul

start "KidTrend Mobile" cmd /c "cd apps\mobile && npx expo start -c --tunnel"

:: Open browser
start http://localhost:5173

echo KidTrend Radar is now analyzing trends...
exit
