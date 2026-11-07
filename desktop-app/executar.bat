@echo off
chcp 65001 > nul
echo ======================================================================
echo   SEED-PR · Sistema de Gestão de Movimentações (Estágio Probatório)
echo ======================================================================
echo.

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Java não encontrado no PATH!
    echo Execute no terminal: winget install Microsoft.OpenJDK.21
    echo e reinicie o terminal.
    echo.
    pause
    exit /b 1
)

if exist target\ep-movimentacoes-swing-1.0.0.jar (
    echo Iniciando o aplicativo...
    java -jar target\ep-movimentacoes-swing-1.0.0.jar
) else (
    echo Compilando com Maven...
    mvn clean package
    if %errorlevel% equ 0 (
        echo Iniciando o aplicativo...
        java -jar target\ep-movimentacoes-swing-1.0.0.jar
    ) else (
        echo [ERRO] Falha ao compilar com Maven.
        pause
    )
)
