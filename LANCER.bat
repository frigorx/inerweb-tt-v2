@echo off
chcp 65001 >nul
cd /d "%~dp0"
title InerWeb Classroom v4.0

echo.
echo   ══════════════════════════════════════════════════
echo   INERWEB CLASSROOM v4.0
echo   Hub de partage de fichiers en classe
echo   ══════════════════════════════════════════════════
echo.

:: Vérifier Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo   ERREUR : Node.js n'est pas installe !
    echo   Telechargez-le sur https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo   Node.js detecte :
node --version
echo.

:: Installer les dépendances si nécessaire
if not exist "node_modules" (
    echo   Installation des dependances...
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo   ERREUR : L'installation a echoue.
        pause
        exit /b 1
    )
    echo   OK !
    echo.
)

:: Créer le dossier partage s'il n'existe pas
if not exist "partage" (
    mkdir partage
    echo   Dossier "partage" cree.
    echo.
)

:: Lancer le serveur
echo   Demarrage du serveur...
echo   ──────────────────────────────────────────────────
echo.
node classroom-server.js

if %ERRORLEVEL% neq 0 (
    echo.
    echo   Le serveur s'est arrete avec une erreur.
    echo   Verifiez les messages ci-dessus.
) else (
    echo.
    echo   Serveur arrete.
)
pause
