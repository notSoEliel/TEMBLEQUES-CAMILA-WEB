# Seguridad y configuración

## Objetivo

La API y el servidor MCP deben fallar de forma segura cuando faltan secretos, separar local/CI de staging/producción y aplicar autorización por operación. Los mocks solo sirven para pruebas locales y CI.

## Ambientes

| Ambiente | `APP_ENV` | Mocks | Integraciones | Seed |
|---|---|---:|---|---|
| Local | `local` | Permitidos explícitamente | `demo` o `real` | Controlado |
| CI/E2E | `ci` | Permitidos explícitamente | `demo` | `reset` |
| Staging | `staging` | Prohibidos | Reales o sandbox | `upsert` |
| Producción | `production` | Prohibidos | Reales | Deshabilitado |

En staging y producción el backend valida al arrancar MongoDB, Clerk, Svix, Cloudinary, Stripe y las credenciales internas MCP. El proceso termina si falta una variable o conserva un placeholder. No se imprimen valores de secretos en el error.

## Protección HTTP

- CORS permite únicamente `FRONTEND_URL` y `CORS_ALLOWED_ORIGINS` exactos.
- Las solicitudes mutables y los preflight de orígenes no permitidos responden `403 ORIGIN_NOT_ALLOWED`.
- El rate limiting usa ventanas deslizantes en memoria con buckets separados para público, autenticación, checkout y administración.
- Los límites y el número máximo de claves son configurables por ambiente. El almacenamiento es acotado y se limpian entradas expiradas.
- Webhooks firmados y health checks no consumen el límite de usuario.

## Clerk y roles

Clerk `publicMetadata.role` es la fuente de sincronización; la decisión final siempre se toma en el backend. Los roles son:

- `owner`: acceso completo y gestión de roles.
- `operator`: reservas, clientes, contactos, cupones y reportes operativos.
- `inventory`: productos, inventario y mantenimiento.
- `support`: consultas de clientes, reservas y contactos.
- `client`: operaciones B2C propias.

El valor legacy `admin` solo se acepta como entrada de compatibilidad y se normaliza inmediatamente a `owner`; no forma parte del tipo ni del enum persistido. La conversión de datos existentes se ejecuta con `cd backend && bun run migrate:legacy-roles --dry-run` y, después de revisar los conteos, `cd backend && bun run migrate:legacy-roles --apply`. El comando está bloqueado en producción salvo que se habilite explícitamente `LEGACY_ROLE_MIGRATION_ALLOW_PRODUCTION=true`. No se permite que un propietario se quite a sí mismo el último acceso de propietario.

## MCP remoto

`MCP_ADMIN_API_KEY` y `MCP_CLIENT_API_KEY` son credenciales de servicio para CI e integraciones internas. `MCP_BACKEND_ADMIN_TOKEN` y `MCP_BACKEND_CLIENT_TOKEN` mantienen compatibilidad con esas identidades de máquina. Los usuarios humanos usan OAuth con Clerk; el rol se obtiene en el servidor y no mediante una cabecera enviada por el cliente.

El endpoint `/mcp` acepta guest explícito. Sin token solo permite catálogo y disponibilidad. Una llamada guest a una tool protegida responde `401` con metadata OAuth. `MCP_AUTH_REQUIRED=false` nunca concede scopes administrativos.

Las llamadas OAuth no reenvían el token de Clerk al backend. MCP utiliza una aserción EdDSA breve y el backend valida issuer, audiencia, expiración, firma y usuario antes de aplicar los permisos reales. `MCP_BACKEND_MCP_TOKEN` autentica únicamente el transporte interno entre ambos servicios.

El MCP comprueba scopes antes de llamar al backend y mantiene una lista de orígenes exactos. El endpoint `/health` no devuelve URLs, flags ni presencia de secretos.

## Auditoría

Toda mutación administrativa genera un `AdminAuditLog` con actor, rol, acción, recurso, origen (`web` o `mcp`), ruta, estado HTTP, IP, user-agent y fecha. Los payloads se almacenan redactando tokens, firmas, claves, contraseñas y datos de tarjeta. El registro es consultable con paginación por `GET /api/admin/audit` y requiere `audit.read`.

## Evidencia de staging

Las comprobaciones realizadas después del despliegue de la fase 2 fueron:

- backend `/health`: `200`;
- `/api/admin/dashboard` sin token: `401 AUTH_TOKEN_REQUIRED`;
- preflight CORS desde origen no permitido: `403 ORIGIN_NOT_ALLOWED`;
- MCP `/mcp` sin token ejecutando `tools/list`: `200` y solo dos tools públicas;
- MCP guest ejecutando una tool administrativa: `401 MCP_OAUTH_REQUIRED`;
- MCP con API key administrativa ejecutando `admin.dashboard.summary`: `200`;
- MCP con API key cliente descubriendo solo las seis tools de cliente;
- MCP OAuth con rol real y aserción MCP→backend;
- rate limiting de autenticación: `429 RATE_LIMIT_EXCEEDED` después del límite configurado;
- seed de staging: 12 productos, 3 reservas, 2 usuarios y 3 aceptaciones de términos.
