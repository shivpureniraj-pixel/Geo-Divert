@echo off
title GeoDivert AI Platform - 3D MapLibre & FastAPI Server
color 0A

echo =========================================================================
echo               GEODIVERT TOURISM AI PLATFORM (AMRAVATI)
echo    Spatial Crowd Redistribution, 3D MapLibre Heatmap and FastAPI Server
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
    echo [INFO] Training initial Crowd Density DecisionTree Model...
    python backend\train_model.py
    echo.
)

:: Step 3: Terminate any old lingering python processes on port 8000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)

:: Step 4: Launch FastAPI Backend Server
echo [1/2] Starting FastAPI Backend API Server on http://127.0.0.1:8000 ...
start "GeoDivert FastAPI Backend" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"

:: Step 5: Pause briefly for backend startup
timeout /t 3 /nobreak >nul

:: Step 6: Launch 3D MapLibre Frontend UI at Local Web Server URL
echo [2/2] Launching GeoDivert 3D Interactive Map UI on http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"

echo.
echo =========================================================================
echo GeoDivert is up and running!
echo  - Frontend Web UI: http://127.0.0.1:8000
echo  - FastAPI Backend API: http://127.0.0.1:8000/api/health
echo  - Interactive Swagger Docs: http://127.0.0.1:8000/docs
echo.
echo Keep this terminal window open during your hackathon presentation.
echo =========================================================================
echo.
pause
