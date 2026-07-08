# Despliegue Staging

## Estado actual

- Frontend staging: https://frontend-navy-five-22.vercel.app
- Backend staging: https://backend-production-e696.up.railway.app
- Healthcheck backend: https://backend-production-e696.up.railway.app/health
- Base de datos staging: MongoDB gestionado en Railway.

El backend esta desplegado en Railway desde la carpeta `backend` como raiz del servicio, con `bun run start` y healthcheck en `/health`. El frontend esta desplegado en Vercel desde `frontend` y consume la API mediante `VITE_API_URL`.

## Estrategia preferida

Usar Railway para backend y Vercel para frontend si la cuenta de Railway tiene creditos disponibles. Railway simplifica logs, variables y despliegue por CLI. La base de datos recomendada es MongoDB Atlas M0.

## Fallback

Si Railway bloquea por creditos o billing, desplegar backend en Render. Render free puede entrar en reposo tras inactividad, por lo que conviene abrir la URL antes de la demo.

## Variables de backend

- `MONGO_URI`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `FRONTEND_URL`
- `NODE_ENV=production`
- `PORT`

## Variables de frontend

- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_CLOUDINARY_CLOUD_NAME`
- `VITE_CLOUDINARY_UPLOAD_PRESET`

## Comandos Railway sugeridos

```bash
railway login
railway init
railway variables
railway up . --path-as-root --service backend
```

El frontend puede desplegarse desde Vercel conectado a la rama `staging`.

## Archivos incluidos

- `backend/railway.json`: configura build, start command y healthcheck del backend.
- `frontend/vercel.json`: configura build Vite y rewrite SPA para React Router.
