# Servidor MCP

## Objetivo

El servidor MCP expone herramientas autenticadas para que Codex o Claude Code consulten y operen capacidades clave de Tembleques Camila. Las tools corresponden a historias marcadas como `[MCP]` en el documento A13 y cubren catalogo, reservas, pagos, administracion, reportes, auditoria y salud tecnica.

## Despliegue remoto

- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- Healthcheck: https://mcp-server-production-321a.up.railway.app/health
- Plataforma: Railway, servicio `mcp-server`.
- Transporte: Streamable HTTP.
- Backend consumido: https://backend-production-e696.up.railway.app

El endpoint `/mcp` acepta JSON-RPC MCP por HTTP. El endpoint `/health` permite verificar que el servicio esta vivo y que tiene tokens configurados.

## Ejecucion local HTTP

```bash
cd mcp-server
bun install
MCP_BACKEND_URL=http://localhost:3000 \
MCP_ADMIN_TOKEN=mock-admin-token \
MCP_CLIENT_TOKEN=mock-client-token \
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
MCP_ADMIN_TOKEN=mock-admin-token \
MCP_CLIENT_TOKEN=mock-client-token \
bun run start:stdio
```

Comando importable:

```bash
bun /ruta/al/repo/mcp-server/src/index.ts
```

## Variables requeridas

- `MCP_BACKEND_URL`: URL del backend Hono.
- `MCP_ADMIN_TOKEN`: token Bearer con rol administrador.
- `MCP_CLIENT_TOKEN`: token Bearer de cliente.
- `PORT`: puerto HTTP para Railway o desarrollo local.
- `MCP_ALLOWED_ORIGIN`: origen CORS opcional. Por defecto usa `*`.

## Seguridad

Las tools administrativas usan `MCP_ADMIN_TOKEN`. Las tools de cliente usan `MCP_CLIENT_TOKEN`. Las tools publicas no envian token salvo que lo requieran por contexto. El servidor MCP no imprime tokens.

Para el avance academico se mantienen tokens demo aceptados por el backend (`mock-admin-token` y `mock-client-token`). Para produccion real deben reemplazarse por tokens emitidos por el sistema de autenticacion o por un proxy MCP con OAuth/API key rotativa.

## Prueba rapida remota

Listar tools:

```bash
curl -sS https://mcp-server-production-321a.up.railway.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

Ejecutar health tool:

```bash
curl -sS https://mcp-server-production-321a.up.railway.app/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
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
