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

El valor legado `admin` se normaliza a `owner` durante la migración. No se permite que un propietario se quite a sí mismo el último acceso de propietario.

## MCP remoto

`MCP_ADMIN_API_KEY` y `MCP_CLIENT_API_KEY` son credenciales externas con scopes separados. `MCP_BACKEND_ADMIN_TOKEN` y `MCP_BACKEND_CLIENT_TOKEN` son credenciales internas distintas para que el MCP llame a Hono. En HTTP remoto, `MCP_CLIENT_IDENTITY=clerk` obliga a las tools de cliente a recibir además `X-MCP-Clerk-Token`; así una key cliente no convierte a todos los usuarios en un único usuario técnico.

Todas las solicitudes HTTP a `/mcp`, incluidas `tools/list`, requieren Bearer cuando `MCP_AUTH_REQUIRED=true`. Las tools públicas solo omiten la identidad Clerk y los scopes administrativos; no abren el transporte.

El MCP comprueba scopes antes de llamar al backend y mantiene una lista de orígenes exactos. El endpoint `/health` no devuelve URLs, flags ni presencia de secretos.

## Auditoría

Toda mutación administrativa genera un `AdminAuditLog` con actor, rol, acción, recurso, origen (`web` o `mcp`), ruta, estado HTTP, IP, user-agent y fecha. Los payloads se almacenan redactando tokens, firmas, claves, contraseñas y datos de tarjeta. El registro es consultable con paginación por `GET /api/admin/audit` y requiere `audit.read`.

## Evidencia de staging

Las comprobaciones realizadas después del despliegue de la fase 2 fueron:

- backend `/health`: `200`;
- `/api/admin/dashboard` sin token: `401 AUTH_TOKEN_REQUIRED`;
- preflight CORS desde origen no permitido: `403 ORIGIN_NOT_ALLOWED`;
- MCP `/mcp` sin token: `401 MCP_AUTH_REQUIRED`;
- MCP con API key administrativa ejecutando `admin.dashboard.summary`: `200`;
- MCP con API key cliente sin `X-MCP-Clerk-Token` rechazando una tool de reservas;
- MCP con `X-MCP-Clerk-Token` ejecutando una tool sobre las reservas del usuario real;
- rate limiting de autenticación: `429 RATE_LIMIT_EXCEEDED` después del límite configurado;
- seed de staging: 12 productos, 3 reservas, 2 usuarios y 3 aceptaciones de términos.
