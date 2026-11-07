@echo off
chcp 65001 > nul
echo ======================================================================
echo   SEED-PR · Sistema de Gestão de Movimentações (Estágio Probatório)
echo   Interface Moderna FlatLaf com Sincronização TiDB Cloud Serverless
echo ======================================================================
echo.

rem Configura JAVA_HOME e PATH se não estiverem definidos
if not defined JAVA_HOME (
    if exist "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot" (
        set "JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"
    )
)
if defined JAVA_HOME (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)
if exist "C:\Users\Jorge Inacio Dotti\maven\apache-maven-3.9.16\bin" (
    set "PATH=C:\Users\Jorge Inacio Dotti\maven\apache-maven-3.9.16\bin;%PATH%"
)

where java >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Java não encontrado no PATH nem no diretório padrão!
    echo Execute no terminal: winget install Microsoft.OpenJDK.21
    echo e reinicie o terminal.
    echo.
    pause
    exit /b 1
)

echo [1/2] Verificando compilação do pacote Desktop...
if not exist "target\ep-movimentacoes-swing-1.0.0.jar" (
    echo Compilando aplicativo com Maven e FlatLaf...
    call mvn clean package -DskipTests
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao compilar com Maven.
        pause
        exit /b 1
    )
)

echo.
echo [2/2] Iniciando interface FlatLaf SEED-PR...
java -jar target\ep-movimentacoes-swing-1.0.0.jar
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Aplicativo encerrado.
    pause
)
