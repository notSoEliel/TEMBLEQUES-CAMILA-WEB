# Despliegue Staging

## Estado actual

- Frontend staging: https://frontend-navy-five-22.vercel.app
- Backend staging: https://backend-production-e696.up.railway.app
- Backend healthcheck: https://backend-production-e696.up.railway.app/health
- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- MCP healthcheck: https://mcp-server-production-321a.up.railway.app/health
- Base de datos staging: MongoDB gestionado en Railway.

El backend esta desplegado en Railway desde la carpeta `backend` como raiz del servicio, con `bun run start` y healthcheck en `/health`. El MCP esta desplegado en Railway desde la carpeta `mcp-server`, con transporte Streamable HTTP en `/mcp` y healthcheck en `/health`. El frontend esta desplegado en Vercel desde `frontend` y consume la API mediante `VITE_API_URL`.

## Estrategia

Usar Railway para backend, base de datos y MCP; usar Vercel para frontend. Railway simplifica logs, variables, dominios y despliegue por CLI. La base de datos recomendada a mediano plazo es MongoDB Atlas M0 si se requiere separacion mas clara entre staging y produccion.

## Variables de backend

- `MONGO_URI`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CLOUDINARY_UPLOAD_PRESET=tembleques_products_signed`
- `FRONTEND_URL`
- `NODE_ENV=production`
- `PORT`

## Variables de frontend

- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

El frontend no necesita variables `VITE_CLOUDINARY_*`: recibe el nombre de la nube, la API key y el preset desde `/api/media/sign`. El secreto de Cloudinary solo existe en Railway.

## Variables de MCP

- `MCP_BACKEND_URL=https://backend-production-e696.up.railway.app`
- `MCP_ADMIN_TOKEN`
- `MCP_CLIENT_TOKEN`
- `NIXPACKS_NODE_VERSION=22`
- `NODE_ENV=production`

Railway inyecta `PORT` automaticamente. El dominio del servicio MCP debe apuntar al puerto usado por Railway. En el despliegue actual el dominio esta configurado al puerto 8080.

## Comandos Railway utiles

```bash
railway status
railway service list
railway variables --service backend
railway variables --service mcp-server
railway up ./backend --path-as-root --service backend
railway up ./mcp-server --path-as-root --service mcp-server
railway domain list --service mcp-server
```

## Vercel

El frontend se despliega desde la carpeta `frontend`. Cada cambio en variables `VITE_` requiere redeploy porque Vite las incrusta en build.

```bash
cd frontend
vercel --prod --yes
```

## Archivos incluidos

- `backend/railway.json`: configura build, start command y healthcheck del backend.
- `mcp-server/railway.json`: configura build, start command y healthcheck del MCP remoto.
- `frontend/vercel.json`: configura build Vite y rewrite SPA para React Router.
