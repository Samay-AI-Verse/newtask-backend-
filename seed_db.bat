@echo off
echo =========================================================
echo  Seeding MongoDB with Realistic Enterprise Demo Tickets
echo =========================================================

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

python scripts/seed_data.py
pause
