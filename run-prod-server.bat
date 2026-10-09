@echo off
cd /d "%~dp0"
start /B cmd /c "npm run start > %TEMP%\prod40h2.log 2>&1"
exit /b 0
