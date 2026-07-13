# Servidor MCP

## Objetivo

El servidor MCP expone herramientas autenticadas para que Codex o Claude Code consulten y operen capacidades clave de Tembleques Camila. Las tools corresponden a historias marcadas como `[MCP]` en el documento A13 y cubren catalogo, reservas, pagos, administracion, reportes, auditoria y salud tecnica.

## Despliegue remoto

- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- Healthcheck: https://mcp-server-production-321a.up.railway.app/health
- Plataforma: Railway, servicio `mcp-server`.
- Transporte: Streamable HTTP.
- Backend consumido: https://backend-production-e696.up.railway.app

El endpoint `/mcp` acepta JSON-RPC MCP por HTTP y exige `Authorization: Bearer <MCP_API_KEY>`. El endpoint `/health` permite verificar que el servicio esta vivo sin exponer la configuración interna.

## Ejecucion local HTTP

```bash
cd mcp-server
bun install
MCP_BACKEND_URL=http://localhost:3000 \
MCP_AUTH_REQUIRED=true \
MCP_ADMIN_API_KEY='clave-admin-larga' \
MCP_CLIENT_API_KEY='clave-cliente-larga' \
MCP_BACKEND_ADMIN_TOKEN='credencial-interna-admin' \
MCP_BACKEND_CLIENT_TOKEN='credencial-interna-cliente' \
MCP_ALLOWED_ORIGIN=http://localhost:5173 \
PORT=3900 \
bun run start
```

URLs locales:

- Healthcheck: http://localhost:3900/health
- MCP: http://localhost:3900/mcp

## Ejecucion local stdio

El modo `stdio` se mantiene para importarlo directamente desde Codex o Claude Code.

```bash
cd mcp-server
MCP_BACKEND_URL=http://localhost:3000 \
MCP_AUTH_REQUIRED=false \
MCP_BACKEND_ADMIN_TOKEN='credencial-interna-admin' \
MCP_BACKEND_CLIENT_TOKEN='credencial-interna-cliente' \
bun run start:stdio
```

Comando importable:

```bash
bun /ruta/al/repo/mcp-server/src/index.ts
```

## Variables requeridas

- `MCP_BACKEND_URL`: URL del backend Hono.
- `MCP_ADMIN_API_KEY`: API key externa con scopes administrativos.
- `MCP_CLIENT_API_KEY`: API key externa con scopes de cliente.
- `MCP_BACKEND_ADMIN_TOKEN`: credencial interna del MCP hacia el backend.
- `MCP_BACKEND_CLIENT_TOKEN`: credencial interna de cliente hacia el backend.
- `PORT`: puerto HTTP para Railway o desarrollo local.
- `MCP_AUTH_REQUIRED`: debe ser `true` en staging y producción; solo se puede desactivar en stdio/local explícitamente.
- `MCP_ALLOWED_ORIGIN`: lista separada por comas de orígenes permitidos; no se acepta `*` en staging ni producción.

## Seguridad

Todas las solicitudes HTTP a `/mcp`, incluidas `tools/list`, requieren una API key externa. Las tools administrativas y de cliente aplican scopes separados. El MCP usa credenciales internas distintas para llamar al backend y nunca imprime tokens.

## Prueba rapida remota

Listar tools:

```bash
curl -sS https://mcp-server-production-321a.up.railway.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_ADMIN_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Ejecutar health tool:

```bash
curl -sS https://mcp-server-production-321a.up.railway.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_ADMIN_API_KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ops.health.check","arguments":{}}}'
```

## Tools implementadas

- `admin.dashboard.summary`
- `catalog.products.search`
- `catalog.availability.check`
- `rentals.draft.create`
- `payments.checkout.create`
- `rentals.mine.list`
- `rentals.pending.cancel`
- `admin.rentals.list`
- `admin.rentals.status.update`
- `admin.calendar.range`
- `admin.products.upsert`
- `admin.inventory.variantMaintenance.set`
- `admin.users.search`
- `admin.users.detail`
- `reports.operations.generate`
- `security.audit.search`
- `ops.health.check`
- `payments.reconcile.run`
