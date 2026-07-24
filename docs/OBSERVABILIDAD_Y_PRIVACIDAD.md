# Observabilidad y privacidad

Este documento registra la implementación de la fase 3 y sus límites operativos. Las historias se mantienen identificadas con su código funcional y su issue de GitHub.

## Historias cubiertas

- **H48 — Logs estructurados — issue #45**: cada solicitud registra JSON con fecha, método, ruta, estado, duración y `requestId`.
- **H49 — Métricas operativas — issue #77**: se acumulan solicitudes HTTP, eventos de checkout/pago, latencia promedio y p95, además de errores recientes.
- **H50 — Alertas operativas — issue #78**: se persisten alertas abiertas para pagos fallidos, reservas atrasadas e inventario bajo. Se deduplican por tipo mientras siguen abiertas.
- **H51 — Dashboard técnico — issue #79**: el dashboard administrativo muestra salud de dependencias, cron, métricas recientes y alertas resolubles según permisos.
- **H59 — Privacidad y retención — issue #85**: el usuario autenticado puede exportar sus datos y solicitar anonimización. Se preservan únicamente los registros necesarios para reservas y obligaciones contables.

## Seguridad de la observabilidad

Las rutas `/api/admin/observability/*` requieren autenticación Clerk y el permiso `observability.read`. Resolver una alerta requiere además `observability.write`, reservado al rol propietario.

Los logs pasan por la misma sanitización de auditoría que elimina credenciales, tokens, cookies, secretos y estructuras demasiado profundas. No se guardan cuerpos completos de solicitudes ni datos de tarjetas.

La vista de salud identifica configuración y estado de MongoDB, Clerk, Stripe, Cloudinary, CORS, respaldos y tareas cron. No expone valores de secretos ni intenta simular una comprobación externa como si fuera una prueba de disponibilidad de cada proveedor.

## Privacidad y retención

`GET /api/privacy/export` entrega al usuario autenticado su perfil local, reservas y aceptaciones de términos.

`DELETE /api/privacy` anonimiza perfil, mensajes de contacto y metadatos de términos. Las reservas y los importes se conservan porque forman parte del historial operativo y contable. La eliminación de la cuenta externa de Clerk es una operación separada del proveedor y debe ejecutarse mediante el procedimiento administrativo correspondiente; el endpoint local no finge haberla eliminado.

La exportación y la anonimización deben probarse con una cuenta QA antes de habilitar el flujo visible para clientes finales.
