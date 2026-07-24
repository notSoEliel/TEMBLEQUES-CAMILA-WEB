# Operación administrativa

Este documento describe las capacidades operativas incorporadas en la fase 6 y sus límites actuales. Los briefs de fase y la evidencia narrativa de presentación se conservan fuera del repositorio; aquí se documenta el comportamiento técnico que debe mantenerse.

## Principios de acceso

Todas las rutas administrativas requieren un token de Clerk o un token de servicio autorizado. La interfaz no sustituye los permisos del backend.

Roles principales:

| Rol | Alcance resumido |
| --- | --- |
| `owner` | Acceso completo, configuración, roles, auditoría, pagos y reportes fiscales. |
| `operator` | Reservas, usuarios, incidencias, contacto, promociones y consultas operativas. |
| `inventory` | Productos, inventario, bajo stock y mantenimientos. |
| `support` | Contacto, usuarios, incidencias y consultas de reservas. |
| `client` | No tiene permisos administrativos. |

La matriz completa vive en `backend/src/security/permissions.ts` y la configuración de roles se explica en [Seguridad y configuración](./SECURITY_AND_CONFIGURATION.md).

## Módulos de operación

### Búsqueda y reservas

El panel permite buscar productos, usuarios y reservas con paginación. El expediente administrativo de una reserva reúne cliente, producto, fechas, términos, estado, pago, historial y acciones permitidas.

Rutas de frontend:

```text
/admin/inventory
/admin/users
/admin/reservations
/admin/reservations/:id
```

Las búsquedas se ejecutan en backend y deben conservar `page`, `limit` y los filtros pertinentes en la URL.

### Contacto e incidencias

El cliente envía mensajes desde `/contacto`. El equipo los gestiona desde `/admin/contacts`.

Las incidencias se gestionan desde `/admin/incidents` y pueden asociarse con una reserva, usuario o producto. Registran tipo, severidad, descripción, estado, notas, resolución y timeline. Crear o actualizar una incidencia puede producir una notificación para el usuario relacionado.

### Reportes

Los reportes operativos se consultan desde `/admin/reports` y pueden exportarse:

```text
GET /api/admin/reports/inventory-stats
GET /api/admin/reports/export-csv
```

Los reportes financieros requieren `reports.fiscal`:

```text
GET /api/admin/reports/financial/export-csv
GET /api/admin/reports/financial/export.pdf
```

Las exportaciones financieras son académicas y operativas. No son facturas fiscales electrónicas ni sustituyen una integración con la DGI.

### Promociones

Las promociones se gestionan desde `/admin/coupons`. El backend valida porcentaje, vigencia, límites de uso, límites por usuario y estado. La validación de checkout siempre se repite en backend.

### Bajo stock y mantenimiento

La vista de bajo stock se consulta mediante:

```text
GET /api/admin/maintenance/low-stock?page=1&limit=20
```

El umbral se cambia con:

```text
PATCH /api/admin/maintenance/threshold
```

El sistema excluye variantes en mantenimiento permanente o temporal activo. Las escrituras de inventario requieren `inventory.write`.

Los mantenimientos se crean y eliminan con:

```text
GET    /api/admin/maintenance
POST   /api/admin/maintenance
DELETE /api/admin/maintenance/:id
```

El backend rechaza fechas inválidas y solapamientos del mismo producto y talla con los códigos `MAINTENANCE_DATE_RANGE_INVALID` y `MAINTENANCE_OVERLAP`.

## Notificaciones transaccionales

El centro de notificaciones del cliente está disponible en `/notifications`.

```text
GET   /api/notifications?page=1&limit=10
PATCH /api/notifications/:id/read
```

El listado siempre se filtra por el usuario autenticado. La clave de idempotencia evita duplicados por reintentos de webhooks, cron o acciones administrativas.

Eventos cubiertos:

- Pago confirmado, fallido o expirado.
- Cancelación.
- Reembolso.
- Incidencia creada o actualizada.
- Bajo stock.

## Integración opcional con Resend

La notificación interna se crea independientemente del proveedor de correo.

### Sin Resend configurado

Si faltan `RESEND_API_KEY` o `RESEND_FROM_EMAIL`:

```text
canal in_app: creado
canal email: skipped
error_code: EMAIL_PROVIDER_NOT_CONFIGURED
```

Esto es el comportamiento esperado en local, CI y el staging actual.

### Con Resend configurado

Variables del backend:

```text
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_REPLY_TO (opcional)
```

El remitente debe estar verificado en Resend. El flujo de correo es:

```text
pending -> sent
pending -> failed
```

El backend llama a `https://api.resend.com/emails`, envía una clave de idempotencia, espera como máximo ocho segundos y registra un error sanitizado si el proveedor falla. No se imprimen API keys, tokens ni contenido sensible.

La integración no implementa todavía una cola persistente de reintentos. Un envío fallido queda registrado como `failed` y requiere una estrategia operativa posterior si se necesita reintento automático.

## Validación operativa

El workflow `Staging Smoke` valida sobre el backend remoto:

- Clerk y Stripe reales en modo test.
- Seed de staging.
- H70: aislamiento y lectura de notificaciones.
- H71: permisos, bajo stock, umbral y solapamiento de mantenimiento.

El smoke específico está en `tests/e2e/staging-phase6.spec.ts`. Utiliza secretos del environment `staging` de GitHub Actions y no requiere copiar credenciales al repositorio.

## Límites actuales

- Resend está integrado, pero no activado en staging.
- No hay cola persistente de reintentos de correo.
- Las promociones no sustituyen un sistema fiscal.
- Los reportes financieros no son facturas DGI.
- La separación definitiva de producción se documentará en la fase 5.
- La auditoría global de observabilidad, backups, restauración y privacidad continúa en las historias abiertas de la fase 3.
