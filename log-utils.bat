@echo off
SetLocal EnableExtensions
powershell -NoProfile -Command "Get-Content -Path '%TEMP%\verify40h2c.log' -Raw | Out-File -FilePath '%TEMP%\verify40h2c.txt' -Encoding UTF8"
