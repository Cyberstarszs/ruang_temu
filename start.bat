@echo off
title RUANG TEMU - Cafe & POS Management System
echo ===================================================
echo     RUANG TEMU - Cafe & POS Management System
echo ===================================================
echo Memeriksa dependensi sistem...

if not exist node_modules (
    echo [1/3] Menginstall dependensi root...
    call npm install
)

if not exist backend\node_modules (
    echo [2/3] Menginstall dependensi backend...
    call npm install --prefix backend
)

if not exist frontend\node_modules (
    echo [3/3] Menginstall dependensi frontend...
    call npm install --prefix frontend
)

echo.
echo Menjalankan Backend (Port 5000) dan Frontend (Port 3000)...
echo POS & Web Kasir    : http://localhost:3000
echo Self-Order QR Meja : http://localhost:3000?meja=M01
echo Backend API        : http://localhost:5000/health
echo ===================================================
echo.

call npm run dev
