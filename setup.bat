@echo off
echo =========================================================
echo  IntelliTicket - Python Virtual Environment & Setup
echo =========================================================

REM Check if Python is available in PATH or fallback to standard paths
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set PYTHON_CMD=python
) else (
    where py >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set PYTHON_CMD=py
    ) else (
        echo Python was not found in your PATH. 
        echo Please ensure Python 3.10+ is installed and added to PATH.
        pause
        exit /b 1
    )
)

echo [1/4] Using Python: %PYTHON_CMD%
if not exist "venv" (
    echo [2/4] Creating virtual environment (.venv / venv)...
    %PYTHON_CMD% -m venv venv
) else (
    echo [2/4] Virtual environment already exists.
)

echo [3/4] Activating venv and installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt

if not exist ".env" (
    echo [4/4] Creating .env file from .env.example...
    copy .env.example .env
) else (
    echo [4/4] .env file is ready.
)

echo.
echo =========================================================
echo  Setup Complete! 
echo  1. Ensure MongoDB is running (run start_mongo.bat or net start MongoDB)
echo  2. Run seed_db.bat to populate demo data
echo  3. Run run_server.bat to start FastAPI
echo =========================================================
pause
