@echo off
title Estagio Probatorio - Servidor Local
echo ========================================================
echo   Iniciando Plataforma Estagio Probatorio (SEED/PR)
echo ========================================================
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"
echo Abrindo servidor de desenvolvimento local Vite...
echo Pressione Ctrl+C para encerrar o servidor quando terminar.
echo ========================================================
npm run dev
pause
