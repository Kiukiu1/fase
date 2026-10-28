@echo off
cd /d %~dp0
echo Dang bat DB (cong 5433)...
docker compose up -d db
start "FASE API" cmd /k "cd fase-be && npm run dev"
start "FASE Sales" cmd /k "cd fase-fe && npm run dev"
echo API/CRM: http://localhost:4000/cms   Sales: http://localhost:5173   Swagger: http://localhost:4000/swagger
