@echo off
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-playlist.ps1"
echo.
echo Muat ulang (refresh) halaman web agar daftar lagu terbaru terbaca.
pause
