# Despliegue Staging

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
railway up --service backend
```

El frontend puede desplegarse desde Vercel conectado a la rama `staging`.

## Archivos incluidos

- `backend/railway.json`: configura build, start command y healthcheck del backend.
- `frontend/vercel.json`: configura build Vite y rewrite SPA para React Router.
