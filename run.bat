@echo off
chcp 65001 >nul
title RISUU MINI BOT 109
cd /d "%~dp0"
if not exist node_modules call npm ci
npm start
pause
