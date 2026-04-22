# Reglas de Pruebas (Testing) - Tembleques Camila

La plataforma debe incluir cobertura de calidad automatizada en dos niveles: unitario y end-to-end.

## 1. Testing Unitario
- **Herramienta**: Vitest (o el test runner de Bun `bun test`).
- **Objetivo**: Validar lógica de negocio aislada.
- **Cobertura Mínima**: 80% en módulos críticos.
- **Casos Obligatorios**:
  - Reglas de disponibilidad de inventario.
  - Cálculo de total de alquiler.
  - Validaciones de fechas.
  - Lógica de aceptación de términos.
  - Permisos por rol (cliente vs admin).

## 2. Testing End-to-End (E2E)
- **Herramienta**: Playwright.
- **Objetivo**: Validar flujos completos desde interfaz hasta persistencia.
- **Flujos Obligatorios**:
  - Registro e inicio de sesión de usuario.
  - Búsqueda y filtrado en el catálogo.
  - Proceso completo de reserva (checkout).
  - Bloqueo de checkout sin aceptación de términos.
  - Validación de pago exitoso y confirmación.
  - Gestión de reserva en el panel de administrador.

## 3. Integración Continua
- Ejecutar pruebas unitarias en cada pull request.
- Ejecutar pruebas E2E en la rama principal y antes de un release.
- Publicar reportes de resultados y evidencias (capturas/logs).
