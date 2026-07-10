@echo off
REM DebateAI launcher — uses Node bundled inside the project folder.
set "NODEDIR=%~dp0nodejs"
set "PATH=%NODEDIR%;%PATH%"
cd /d "%~dp0"

echo.
echo  Starting DebateAI...
echo  A QR code will appear below in about 30-60 seconds.
echo  Scan it with the Expo Go app on your phone.
echo  Keep this window open. (Press Ctrl+C to stop the server.)
echo.

call "%NODEDIR%\npx.cmd" expo start --tunnel

echo.
echo  Expo stopped. You can close this window now.
pause >nul
