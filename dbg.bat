@echo off
SetLocal EnableExtensions
echo ORIG_LOG=%TEMP%\verify40h2c.log
for %%i in (%TEMP%\verify40h2c.log) do @echo ORIG_BYTES=%%~za
powershell -NoProfile -Command "Select-String -Path '%TEMP%\verify40h2c.log' -Pattern 'DBG' | ForEach-Object { $_.Line } | Out-File -FilePath '%TEMP%\dbg.txt' -Encoding UTF8"
for %%i in (%TEMP%\dbg.txt) do @echo DBG_BYTES=%%~za
powershell -NoProfile -Command "$l=(Get-Content -Path '%TEMP%\verify40h2c.log' -Raw).Split([Environment]::NewLine); '$l.Length lines total'"
type "%TEMP%\dbg.txt"
