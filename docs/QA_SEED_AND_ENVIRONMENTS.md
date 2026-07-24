# Seed y separación de ambientes

## Principio

Cada ambiente usa una base de datos distinta. El seed nunca se ejecuta contra producción: `APP_ENV=production` lo rechaza y el arranque también mantiene el seed deshabilitado.

| Ambiente | `APP_ENV` | `SEED_PROFILE` | `SEED_MODE` | Datos gestionados |
|---|---|---|---|---|
| Local | `local` | `ci` | `upsert` | Catálogo reproducible para desarrollo |
| CI | `ci` | `ci` | `reset` | Catálogo limpio por ejecución |
| Staging | `staging` | `staging` | `upsert` | Catálogo, usuarios sintéticos y reservas de demostración |
| Demo académico | `demo` | `demo` | `upsert` | Copia aislada de staging para presentación |
| Producción | `production` | — | — | El seed debe estar deshabilitado |

## Claves y modos

Los productos se identifican por `seed_key` y las reservas por `fixture_key`. Esto evita depender de nombres o de ObjectId generados por MongoDB.

### Imágenes y contenido del catálogo

Las imágenes, nombres, traducciones, descripciones, precios, categorías, tallas, cantidades y configuración de depósito de `backend/src/seed.ts` reflejan el catálogo vigente de staging y sirven como datos iniciales para productos nuevos. El seeder no sobrescribe ningún producto existente en modo `upsert`; por tanto, conserva también las fotografías reales alojadas en Cloudinary y cualquier edición realizada desde el panel administrativo.

El perfil `ci` parte normalmente de una base limpia y utiliza estos mismos 12 productos para mantener los contratos de disponibilidad y reservas reproducibles. El seeder no debe utilizarse para actualizar el catálogo operativo.

- `upsert`: crea las fixtures que no existen y deja intactos los productos existentes; no borra ni actualiza productos reales.
- `reset`: elimina únicamente el namespace semilla y lo reconstruye. Es el modo recomendado para CI.
- `SEED_PRUNE=true`: elimina fixtures semilla obsoletas que ya no estén en el catálogo actual. No debe activarse en una base compartida con datos operativos sin revisar primero el alcance.

## Comandos

```bash
cd backend
APP_ENV=ci SEED_PROFILE=ci SEED_MODE=reset bun run seed
APP_ENV=staging SEED_PROFILE=staging SEED_MODE=upsert bun run seed
APP_ENV=demo SEED_PROFILE=demo SEED_MODE=upsert bun run seed
```

En staging y demo se generan además reservas en estados `pending`, `reserved` y `returned`, usuarios sintéticos y aceptaciones de términos con IP, agente y fecha. Las cuentas sintéticas no sustituyen a las cuentas reales de Clerk para el smoke test de autenticación; esas pruebas usan credenciales de test dedicadas.

## E2E

El servidor E2E arranca el backend con `APP_ENV=ci`, `SEED_ENABLED=true`, `SEED_PROFILE=ci` y `SEED_MODE=reset`. Cada ejecución puede recibir un `E2E_MONGO_URI` propio para evitar colisiones entre jobs. Los tests localizan productos por la API y no dependen de nombres ni IDs fijos.

El workflow de GitHub ejecuta lint, typecheck, pruebas unitarias, build y Playwright. Aunque Playwright falle, el workflow intenta conservar `playwright-report/` y `test-results/` como artefactos.

## Smoke tests reales de staging

Los smoke tests de Clerk y Stripe están separados de CI y requieren activación explícita. No se ejecutan contra localhost ni con tokens mock:

```bash
E2E_STAGING_URL=https://frontend-staging.example \
E2E_BACKEND_URL=https://backend-staging.example \
E2E_REAL_INTEGRATIONS=true \
E2E_CLERK_EMAIL='cuenta-test' \
CLERK_SECRET_KEY='secreto-test' \
bun run test:e2e:staging
```

La clave de Clerk solo debe inyectarse desde el gestor de secretos o el entorno local protegido; no debe aparecer en el comando guardado, logs ni issues. El helper oficial `@clerk/testing` genera un token real de desarrollo y evita depender de MFA o de una bandeja de correo. Stripe usa por defecto la tarjeta de prueba `4242 4242 4242 4242`, y el test exige que la reserva alcance `reserved` o `paid` por el webhook. Si el endpoint devuelve `demo` o el webhook no cambia el estado, el smoke falla.

El flujo de confirmación y `GET /api/rentals/my` no modifican estados de pago. La única transición financiera se procesa en el webhook con firma validada y deduplicación por `event.id`.

El repositorio incluye `.github/workflows/staging-smoke.yml`, ejecutable manualmente desde GitHub Actions. Usa el environment `staging`, valida que existan la URL y las credenciales de Clerk, ejecuta los smoke de Clerk, Stripe, H70 y H71, y conserva los artefactos aunque fallen. Las claves y el webhook de Stripe permanecen configurados en Railway; nunca se copian al workflow.

El repositorio incluye además `.github/workflows/mcp-staging-smoke.yml` para las historias H83-H100. Este workflow valida guest público, las 18 tools administrativas con API key de servicio, scopes, redacción de datos, operaciones administrativas y limpieza de fixtures. La validación OAuth real se realiza con el bridge MCP y una sesión humana en un cliente compatible; no se automatiza guardando refresh tokens humanos en GitHub. Si se configura `E2E_MCP_OAUTH_TOKEN` para una prueba temporal, utiliza el token únicamente en memoria y ejecuta además el test OAuth de cliente: catálogo, disponibilidad, borrador, checkout sin pago, cancelación y comprobación de limpieza. El token OAuth debe ser de corta duración y de staging; nunca se imprime ni se documenta. Requiere las secrets `MCP_REMOTE_URL`, `MCP_ADMIN_API_KEY`, `MCP_CLIENT_API_KEY`, `STAGING_BACKEND_URL`, `MCP_BACKEND_ADMIN_TOKEN` y `STAGING_FRONTEND_URL`. Nunca imprime sus valores.

El workflow construye el frontend del commit exacto que se está verificando con `VITE_API_URL` apuntando al backend staging y lo sirve temporalmente en el runner. Así el smoke combina frontend versionado + backend staging + Clerk/Stripe reales, sin depender de que un alias de Vercel tenga desplegado el mismo commit. El dominio frontend configurado en `STAGING_FRONTEND_URL` queda reservado para comprobaciones manuales.

Para la evidencia completa de H56/#61, el backend expone `GET /api/admin/seed-status` como lectura administrativa. Devuelve únicamente el ambiente, la configuración no secreta del seed y los conteos del namespace `seed_key`/`fixture_key`; no devuelve documentos ni credenciales.

## Smoke de operación administrativa

El archivo `tests/e2e/staging-phase6.spec.ts` valida sobre el backend remoto y un frontend construido desde el commit probado:

- H70 — notificación interna asociada a una incidencia, aislamiento por usuario y marcado como leída.
- H71 — lectura de bajo stock, permisos de cliente, umbral configurable, creación de mantenimiento, rechazo de solapamiento y limpieza del fixture temporal.

El smoke utiliza secretos del environment `staging` de GitHub Actions. No requiere ni permite copiar tokens al repositorio.

Resend no es un requisito del smoke: si no está configurado, la notificación interna debe seguir funcionando y el registro de correo debe quedar como `skipped`.

## Promoción a la demo

La demo académica debe desplegarse con una base separada de staging o con una copia controlada de sus datos. Primero se valida el catálogo con fixtures; después se sustituyen las imágenes y productos sintéticos por los productos reales implementados. La estructura de claves y el contrato de disponibilidad permanecen iguales, por lo que los tests no necesitan cambiar al sustituir el contenido.
