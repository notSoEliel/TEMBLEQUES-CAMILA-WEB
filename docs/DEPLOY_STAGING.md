# Despliegue Staging

## Estado actual

- Frontend staging: https://temblequescamila.vercel.app
- Backend staging: https://backend-production-e696.up.railway.app
- Backend healthcheck: https://backend-production-e696.up.railway.app/health
- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- MCP healthcheck: https://mcp-server-production-321a.up.railway.app/health
- Base de datos staging: MongoDB gestionado en Railway.

El backend esta desplegado en Railway desde la carpeta `backend` como raiz del servicio, con `bun run start` y healthcheck en `/health`. El MCP esta desplegado en Railway desde la carpeta `mcp-server`, con transporte Streamable HTTP en `/mcp` y healthcheck en `/health`. El frontend esta desplegado en Vercel desde `frontend` y consume la API mediante `VITE_API_URL`.

En el proyecto actual, el proyecto Railway se llama `tembleques-camila-staging`. Su entorno técnico aparece etiquetado como `production`, pero se utiliza como el staging académico actual. La separación real entre staging y producción se documentará y ejecutará posteriormente; no se debe interpretar esta etiqueta como producción real.

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
- `RESEND_API_KEY` (opcional)
- `RESEND_FROM_EMAIL` (opcional; remitente verificado en Resend)
- `RESEND_REPLY_TO` (opcional)
- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `TRUST_PROXY=true`
- `NODE_ENV=production`
- `APP_ENV=staging`
- `AUTH_MOCKS_ENABLED=false`
- `INTEGRATIONS_MODE=real`
- `RATE_LIMIT_ENABLED=true`
- `RATE_LIMIT_PUBLIC_PER_MINUTE`
- `RATE_LIMIT_AUTH_PER_MINUTE`
- `RATE_LIMIT_CHECKOUT_PER_MINUTE`
- `RATE_LIMIT_ADMIN_PER_MINUTE`
- `RATE_LIMIT_MAX_KEYS`
- `MCP_BACKEND_ADMIN_TOKEN`
- `MCP_BACKEND_CLIENT_TOKEN`
- `MCP_BACKEND_MCP_TOKEN`
- `MCP_IDENTITY_PUBLIC_KEY`
- `MCP_IDENTITY_ISSUER=tembleques-camila-mcp`
- `MCP_BACKEND_AUDIENCE=tembleques-camila-backend`
- `SEED_ENABLED=true`
- `SEED_PROFILE=staging`
- `SEED_MODE=upsert`
- `SEED_PRUNE=false`
- `PORT`

## Variables de frontend

- `VITE_API_URL`
- `VITE_CLERK_PUBLISHABLE_KEY`

El frontend no necesita variables `VITE_CLOUDINARY_*`: recibe el nombre de la nube, la API key y el preset desde `/api/media/sign`. El secreto de Cloudinary solo existe en Railway.

## Variables de MCP

- `MCP_BACKEND_URL=https://backend-production-e696.up.railway.app`
- `MCP_GUEST_ENABLED=true`
- `MCP_ADMIN_API_KEY`
- `MCP_CLIENT_API_KEY`
- `MCP_BACKEND_ADMIN_TOKEN`
- `MCP_BACKEND_CLIENT_TOKEN`
- `MCP_BACKEND_MCP_TOKEN`
- `MCP_OAUTH_ENABLED=true`
- `CLERK_SECRET_KEY`
- `MCP_OAUTH_ISSUER`
- `MCP_RESOURCE_URL=https://mcp-server-production-321a.up.railway.app/mcp`
- `MCP_OAUTH_AUDIENCE=https://mcp-server-production-321a.up.railway.app/mcp`
- `MCP_IDENTITY_PRIVATE_KEY`
- `MCP_IDENTITY_ISSUER=tembleques-camila-mcp`
- `MCP_BACKEND_AUDIENCE=tembleques-camila-backend`
- `MCP_ALLOWED_ORIGIN=https://temblequescamila.vercel.app,https://frontend-navy-five-22.vercel.app`
- `NIXPACKS_NODE_VERSION=22`
- `NODE_ENV=production`

La base de datos de staging debe ser distinta de la base de producción. El seed de staging solo actualiza documentos que tienen `seed_key`, `fixture_key` o un `clerkId` del namespace `seed_`; no borra datos manuales de QA. Para una demostración estable se recomienda desplegar el mismo commit con `APP_ENV=demo`, otra `MONGO_URI` y `SEED_PROFILE=demo`.

El dominio público actual de Vercel es `https://temblequescamila.vercel.app`. El alias anterior se conserva temporalmente en `MCP_ALLOWED_ORIGIN` para no romper sesiones o demostraciones que todavía lo utilicen.

Producción debe usar `APP_ENV=production` y `SEED_ENABLED=false`. El backend rechaza la ejecución del seed en ese entorno.

Railway inyecta `PORT` automaticamente. El dominio del servicio MCP debe apuntar al puerto usado por Railway. En el despliegue actual el dominio esta configurado al puerto 8080.

## Comandos Railway utiles

```bash
railway status
railway service list
railway variable list --service backend
railway variable list --service mcp-server
railway up ./backend --path-as-root --service backend
railway up ./mcp-server --path-as-root --service mcp-server
railway domain list --service mcp-server
```

El workflow `MCP Staging Smoke` requiere los secretos de GitHub Actions `MCP_REMOTE_URL`, `MCP_ADMIN_API_KEY` y `MCP_CLIENT_API_KEY`. Si se configura `E2E_MCP_OAUTH_TOKEN`, el smoke también valida el filtrado de tools de un usuario OAuth. Los tokens se utilizan únicamente en memoria y nunca se imprimen.

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

## Verificación operativa del seed

El backend expone `GET /api/admin/seed-status` como lectura administrativa para comprobar el namespace gestionado por el seed sin devolver documentos ni secretos. Requiere el mismo token administrativo que las demás rutas `/api/admin`:

```bash
curl -H "Authorization: Bearer $MCP_BACKEND_ADMIN_TOKEN" \
  https://backend-production-e696.up.railway.app/api/admin/seed-status
```

La respuesta informa el ambiente, perfil, modo y conteos de `products`, `rentals`, `users` y `termsAcceptances`. Esta comprobación debe ejecutarse después de un deploy de staging y conservarse como evidencia del issue H56/#61.

## Notificaciones y Resend

H70 — OPS: Notificaciones transaccionales — issue #96 incorpora notificaciones internas protegidas para pagos, expiraciones, cancelaciones, reembolsos, incidencias y bajo stock.

El correo externo es opcional. Si Railway no tiene `RESEND_API_KEY` y `RESEND_FROM_EMAIL`, el backend conserva la notificación interna y registra el canal de email como:

```text
delivery_status=skipped
error_code=EMAIL_PROVIDER_NOT_CONFIGURED
```

Cuando las variables están configuradas, el flujo es:

```text
pending -> sent
pending -> failed
```

La integración usa la API de Resend, una clave de idempotencia y un timeout de ocho segundos. Los errores se registran de forma sanitizada y no deben interrumpir pagos, webhooks, cancelaciones o incidencias.

Para activar Resend en staging se debe verificar primero el dominio/remitente en Resend, configurar las variables como secretos del servicio backend y ejecutar un smoke controlado que confirme el estado `sent` y la recepción en el buzón. No se deben colocar valores reales en este documento.

## H70 y H71: evidencia remota

El workflow manual `Staging Smoke` también ejecuta:

- H70: creación de una incidencia para la cuenta QA, notificación aislada, lectura autenticada y comprobación de que otro usuario no la recibe.
- H71: consulta de bajo stock, comprobación de permisos, actualización del umbral y rechazo de mantenimientos solapados.

El smoke final de la fase se ejecutó en el workflow `29314726243` sobre el commit `249d9db`.
