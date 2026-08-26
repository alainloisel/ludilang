@echo off
rem Lance AloLangues dans le navigateur avec un petit serveur local.
cd /d "%~dp0"
echo.
echo   AloLangues demarre sur http://localhost:8420/
echo   (laisse cette fenetre ouverte pendant que tu joues)
echo.
start "" http://localhost:8420/
py -m http.server 8420 2>nul || python -m http.server 8420 2>nul || npx --yes serve -l 8420 .
echo.
echo   Impossible de lancer un serveur : installe Python (python.org) ou Node.js.
pause
