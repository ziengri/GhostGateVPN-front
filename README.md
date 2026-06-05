# GhostGateVPN Frontend

Минималистичный React-интерфейс для личного кабинета GhostGateVPN.

## Запуск через Docker Compose

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

В `.env` укажите публичный адрес backend API:

```env
FRONTEND_PORT=5173
API_BASE_URL=https://api.example.com
```

Локально, если backend запущен на этой же машине:

```env
API_BASE_URL=http://localhost:8000
```

После запуска сайт будет доступен на:

```text
http://localhost:5173
```

