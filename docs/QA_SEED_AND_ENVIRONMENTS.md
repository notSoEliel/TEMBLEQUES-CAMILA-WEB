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

- `upsert`: crea o actualiza únicamente las fixtures conocidas; no borra productos reales.
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

## Promoción a la demo

La demo académica debe desplegarse con una base separada de staging o con una copia controlada de sus datos. Primero se valida el catálogo con fixtures; después se sustituyen las imágenes y productos sintéticos por los productos reales implementados. La estructura de claves y el contrato de disponibilidad permanecen iguales, por lo que los tests no necesitan cambiar al sustituir el contenido.
