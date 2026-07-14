# Servidor MCP

## Objetivo y estado

El servidor MCP expone las historias H83–H100 como tools para Codex o Claude Code. El endpoint remoto está desplegado en Railway dentro del proyecto académico `tembleques-camila-staging`; aunque Railway etiqueta técnicamente el entorno como `production`, en este proyecto se trata como staging.

El endpoint HTTP `/mcp` exige una API key MCP incluso para tools de catálogo público. “Público” describe el permiso de la tool, no la apertura del transporte. `/health` es el único endpoint público del servicio y solo confirma que el proceso está vivo.

## Identidad y autorización

La autenticación tiene dos capas:

1. `Authorization: Bearer <MCP_API_KEY>` autentica al consumidor MCP y determina sus scopes.
2. `X-MCP-Clerk-Token: <token-de-sesión-Clerk>` identifica al usuario real para las tools de cliente.

El token Clerk se valida posteriormente en el backend Hono. El servidor MCP no lo guarda en MongoDB, no lo imprime y no lo incluye en respuestas o logs. Las tools `rentals.*` y `payments.checkout.create` fallan si se usa la API key cliente sin identidad Clerk.

Variables externas:

- `MCP_ADMIN_API_KEY`: key con scopes administrativos, técnicos y financieros.
- `MCP_CLIENT_API_KEY`: key con scopes de cliente.

Variables internas:

- `MCP_BACKEND_ADMIN_TOKEN`: credencial MCP hacia el usuario de servicio administrativo del backend.
- `MCP_BACKEND_CLIENT_TOKEN`: compatibilidad para ejecución local explícita con identidad de servicio.
- `MCP_CLIENT_IDENTITY=clerk`: obligatorio para HTTP remoto de staging.

No se crean tokens separados de finanzas o diagnóstico en esta fase; esa separación queda modelada mediante scopes y pruebas negativas.

## Matriz de scopes

| Grupo | Scopes |
|---|---|
| Catálogo | `catalog.read`, `availability.read` |
| Cliente | `rentals.create`, `rentals.read.own`, `rentals.cancel.own`, `payments.create` |
| Administración | `dashboard.read`, `reservations.read`, `reservations.write`, `products.write`, `inventory.write`, `users.read`, `reports.read`, `audit.read`, `observability.read`, `payments.reconcile` |

La autorización se verifica antes de llamar al backend. Un principal inexistente nunca recibe scopes implícitos.

## Configuración local HTTP

```bash
cd mcp-server
bun install
MCP_BACKEND_URL=http://localhost:3000 \
MCP_AUTH_REQUIRED=true \
MCP_CLIENT_IDENTITY=clerk \
MCP_ADMIN_API_KEY='clave-admin-larga' \
MCP_CLIENT_API_KEY='clave-cliente-larga' \
MCP_BACKEND_ADMIN_TOKEN='credencial-interna-admin' \
MCP_ALLOWED_ORIGIN=http://localhost:5173 \
PORT=3900 \
bun run start
```

Para ejecutar tools cliente desde una integración HTTP, la petición debe llevar además el token Clerk vigente:

```bash
curl -sS http://localhost:3900/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H "Authorization: Bearer $MCP_CLIENT_API_KEY" \
  -H "X-MCP-Clerk-Token: $CLERK_SESSION_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"rentals.mine.list","arguments":{}}}'
```

## Configuración local stdio

El transporte stdio está reservado para uso local explícito. No debe utilizarse como configuración remota de staging.

```bash
cd mcp-server
MCP_BACKEND_URL=http://localhost:3000 \
MCP_AUTH_REQUIRED=false \
MCP_CLIENT_IDENTITY=service \
MCP_BACKEND_ADMIN_TOKEN='credencial-interna-admin' \
MCP_BACKEND_CLIENT_TOKEN='credencial-interna-cliente' \
bun run start:stdio
```

## Contrato operativo común

- Cada llamada genera un `requestId` con formato `mcp-<UUID>`.
- El `requestId` se propaga como `x-request-id` al backend y vuelve en la respuesta de la tool.
- Las llamadas de lectura tienen timeout de 15 segundos.
- Checkout y conciliación tienen timeout de 30 segundos.
- Los errores de backend se normalizan sin stacks, tokens ni mensajes internos.
- 401, 403, 404, 409 y 5xx conservan un código seguro y el `requestId`.
- Los DTO administrativos son de lista blanca; no se devuelven IP, User-Agent, tokens ni datos de tarjeta innecesarios.

## Tools implementadas

- H83 / issue #109 — `admin.dashboard.summary`
- H84 / issue #110 — `catalog.products.search`
- H85 / issue #111 — `catalog.availability.check`
- H86 / issue #112 — `rentals.draft.create`
- H87 / issue #113 — `payments.checkout.create`
- H88 / issue #114 — `rentals.mine.list`
- H89 / issue #115 — `rentals.pending.cancel`
- H90 / issue #116 — `admin.rentals.list`
- H91 / issue #117 — `admin.rentals.status.update`
- H92 / issue #118 — `admin.calendar.range`
- H93 / issue #119 — `admin.products.upsert`
- H94 / issue #120 — `admin.inventory.variantMaintenance.set`
- H95 / issue #121 — `admin.users.search`
- H96 / issue #122 — `admin.users.detail`
- H97 / issue #123 — `reports.operations.generate`
- H98 / issue #124 — `security.audit.search`
- H99 / issue #125 — `ops.health.check`
- H100 / issue #126 — `payments.reconcile.run`

H89 usa una ruta específica que solo cancela reservas `pending` y no ejecuta reembolsos. H94 cambia el flag permanente de la variante y no crea un bloqueo temporal de fechas. H97 ofrece `json`, `csv` y `summary`, sin sustituir los reportes fiscales.

## Smoke remoto reproducible

El smoke transversal corresponde a `APOYO - QA - Smoke tests de herramientas MCP`, issue #64. Se ejecuta manualmente mediante GitHub Actions:

```bash
E2E_MCP_SMOKE=true \
E2E_STAGING_URL=https://frontend-staging.example \
E2E_MCP_REMOTE_URL=https://mcp-server-staging.example/mcp \
E2E_MCP_BACKEND_URL=https://backend-staging.example \
MCP_ADMIN_API_KEY='...' \
MCP_CLIENT_API_KEY='...' \
E2E_MCP_BACKEND_ADMIN_TOKEN='...' \
E2E_CLERK_EMAIL='...' \
bun run test:e2e:mcp:staging
```

El workflow valida:

- `/mcp` sin token devuelve 401.
- `tools/list` devuelve las 18 tools.
- catálogo público y disponibilidad;
- identidad Clerk obligatoria para cliente;
- creación de reserva con términos explícitos;
- checkout de Stripe en modo test;
- consulta y cancelación de reservas propias;
- consultas administrativas;
- actualización de estado y auditoría;
- upsert y mantenimiento de producto;
- reportes JSON, CSV y resumen;
- salud técnica protegida;
- conciliación real H100;
- limpieza de productos y reservas temporales.

Los secretos se inyectan desde GitHub Actions y nunca se imprimen, guardan en el repositorio ni se incluyen en issues o artefactos.

## Despliegue

```bash
railway status
railway up ./mcp-server --path-as-root --service mcp-server
```

Antes de mover una historia a `Done` se exige CI verde, typecheck, pruebas, deployment exitoso, smoke remoto y evidencia enlazada entre historia, issue, PR, commit, workflow y deployment.
