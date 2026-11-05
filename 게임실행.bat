@echo off
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8775/"
echo Game server running. Close this window to quit the game.
python -m http.server 8775
