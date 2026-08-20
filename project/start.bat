@echo off
setlocal
set "PROJECT_ROOT=%~dp0"

start "MindEase Backend" cmd /k "cd /d ""%PROJECT_ROOT%backend"" && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
start "MindEase Frontend" cmd /k "cd /d ""%PROJECT_ROOT%frontend"" && npm run dev -- --host 0.0.0.0 --port 3000"

echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
endlocal
