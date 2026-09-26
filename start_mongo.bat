@echo off
echo =========================================================
echo  Starting Local MongoDB Server on Port 27017
echo =========================================================

REM Create local data directory if needed
if not exist "C:\data\db" (
    mkdir "C:\data\db" 2>nul
)

if exist "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" (
    "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe" --dbpath "C:\data\db"
) else (
    mongod --dbpath "C:\data\db"
)
pause
