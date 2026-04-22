# Reglas de Pruebas (Testing) - Tembleques Camila

1. **Pruebas Unitarias Funcionales**:
   - Utilizar Vitest para pruebas unitarias.
   - Cada funcionalidad nueva (funciones de cálculo de precios, utilidades, controladores) debe tener su test correspondiente.
   - Los tests unitarios deben estar cerca de la implementación (ej. `[nombre].test.ts`).

2. **Pruebas End-to-End (E2E)**:
   - Utilizar Playwright para los flujos completos.
   - Flujos obligatorios a testear:
     - Registro e inicio de sesión de clientes.
     - Navegación por catálogo y selección de producto.
     - Flujo de reserva (checkout) incluyendo la aceptación OBLIGATORIA de términos y condiciones.
     - Flujo de validación de pago con Stripe.
     - Pruebas del panel de administración (crear producto, actualizar reserva).

3. **Ejecución Continua**:
   - Asegurarse de correr las pruebas localmente y de que pasen antes de considerar una funcionalidad como completada.
