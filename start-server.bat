@echo off
title MarkBud API Server
echo Uruchamianie serwera API...
cd /d "%~dp0apps\api"
node_modules\.bin\tsx.cmd src/index.ts
pause
