@echo off
REM Debate Me launcher — double-click this to run the app on your phone.
REM
REM Works two ways: if the project still has the portable `nodejs\` folder from
REM the original PC it uses that, otherwise it uses whatever Node is installed
REM on the machine. Pass arguments to override the Expo flags, e.g.
REM   start.cmd --lan        (faster, but needs the phone on the same Wi-Fi)
setlocal
cd /d "%~dp0"

set "NPX=npx"
if exist "%~dp0nodejs\npx.cmd" (
  set "PATH=%~dp0nodejs;%PATH%"
  set "NPX=%~dp0nodejs\npx.cmd"
)

where node >nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js was not found on this computer.
  echo  Install the LTS version from https://nodejs.org  ^(v20 or newer^),
  echo  then close this window and double-click start.cmd again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo  First run on this computer — installing dependencies.
  echo  This takes a few minutes. Leave the window open.
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo  Install failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

set "EXPO_ARGS=%*"
if "%EXPO_ARGS%"=="" set "EXPO_ARGS=--tunnel"

echo.
echo  Starting Debate Me...
echo  A QR code will appear below in about 30-60 seconds.
echo  Scan it with the Expo Go app on your phone.
echo  Keep this window open. (Press Ctrl+C to stop the server.)
echo.

call "%NPX%" expo start %EXPO_ARGS%

echo.
echo  Expo stopped. You can close this window now.
pause >nul
