@echo off
title GeoDivert AI Platform - 3D MapLibre & FastAPI Server
color 0A

echo =========================================================================
echo               🧭 GEODIVERT TOURISM AI PLATFORM
echo    Spatial Crowd Redistribution, 3D MapLibre Heatmap & FastAPI
echo =========================================================================
echo.

:: Step 1: Ensure Python is available
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not found in PATH! Please install Python 3.10+.
    pause
    exit /b 1
)

:: Step 2: Check if model.pkl exists, if not generate it
if not exist "backend\model.pkl" (
    echo [INFO] Training initial Crowd Density DecisionTree Model (model.pkl)...
    python backend\train_model.py
    echo.
)

:: Step 3: Launch FastAPI Backend Server
echo [1/2] Starting FastAPI Backend API Server on http://127.0.0.1:8000 ...
start "GeoDivert FastAPI Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

:: Step 4: Pause briefly for backend startup
timeout /t 3 /nobreak >nul

:: Step 5: Launch 3D MapLibre Frontend UI in Default Web Browser
echo [2/2] Launching GeoDivert 3D Interactive Map UI...
start "" "%~dp0frontend\index.html"

echo.
echo =========================================================================
echo 🎉 GeoDivert is up and running!
echo  - Frontend UI: Opened in your browser (%~dp0frontend\index.html)
echo  - FastAPI Backend: Running at http://127.0.0.1:8000
echo  - Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo.
echo Keep this terminal window open during your hackathon presentation.
echo =========================================================================
echo.
pause
