@echo off
setlocal
title Fretamentos EJJ - Servidor local

cd /d "%~dp0"

if not exist "node_modules\.bin\next.cmd" (
  echo.
  echo As dependencias do sistema ainda nao foram instaladas.
  echo Abra este projeto no terminal e execute: pnpm install
  echo.
  pause
  exit /b 1
)

echo.
echo =============================================
echo   FRETAMENTOS EJJ - Baixo Guandu
echo =============================================
echo.
echo O sistema sera aberto em: http://localhost:3000
echo Para encerrar, feche esta janela.
echo.

start "" http://localhost:3000
call "node_modules\.bin\next.cmd" dev

pause
