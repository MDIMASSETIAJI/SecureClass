@echo off
echo ========================================================
echo   SECURECLASS - Zero-Trust Academic Platform Launcher
echo ========================================================
echo.

echo [1/2] Menjalankan Face Recognition Microservice (Python FastAPI)...
start "SecureClass Face Service" cmd /k "cd face-service && python run.py"

timeout /t 3 /nobreak >nul

echo [2/2] Menjalankan Web Application (Next.js)...
start "SecureClass Web Server" cmd /k "cd web && npm run dev"

echo.
echo ========================================================
echo   Layanan aktif!
echo   - Web App: http://localhost:3000
echo   - Internal Face Service: http://127.0.0.1:8000
echo ========================================================
echo.
pause

