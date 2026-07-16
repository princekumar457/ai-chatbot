@echo off
title Prince AI Chatbot Server
echo ======================================================
echo          PRINCE AI CHATBOT LOCAL SERVER
echo ======================================================
echo.
echo Starting Flask server in virtual environment...
echo.

:: Check if virtual environment exists
if not exist .venv (
    echo [ERROR] Virtual environment (.venv) folder not found!
    echo Please verify that .venv is installed in the project root.
    echo.
    pause
    exit /b
)

:: Activate virtualenv and run application
call .venv\Scripts\activate.bat
python app.py

echo.
echo Server stopped.
pause
