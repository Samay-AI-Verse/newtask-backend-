@echo off
echo =========================================================
echo  Starting IntelliTicket FastAPI Backend Server
echo =========================================================

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [WARNING] venv not found. Running with global python...
)

echo.
echo Application will be available at:
echo  - Interactive Live Demo UI: http://127.0.0.1:8000/
echo  - Swagger API Documentation: http://127.0.0.1:8000/docs
echo  - ReDoc Documentation:       http://127.0.0.1:8000/redoc
echo.

uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
pause
