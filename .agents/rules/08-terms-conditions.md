# Reglas de Términos y Condiciones - Tembleques Camila

Antes de proceder al pago, el usuario **DEBE** aceptar los términos de alquiler mediante un checkbox obligatorio. 

## UX Requerida
- Checkbox obligatorio y visible.
- Enlace claro hacia el texto completo de los términos.
- **Bloqueo de Checkout**: No se debe habilitar el botón de pago / redirigir a Stripe sin la aceptación explícita.
- **Trazabilidad**: Guardar el registro de aceptación en la base de datos, incluyendo:
  - Timestamp (`accepted_at`).
  - Dirección IP (`ip_address`).
  - User Agent (`user_agent`).
  - Referencia al usuario y a la reserva.

## Texto Resumido Obligatorio (Frontend)
El cliente acepta devolver el producto en las mismas condiciones en que fue entregado. En caso de pérdida, daño, rotura, manchas permanentes o deterioro causado durante el alquiler, el cliente asume la responsabilidad total del costo de reparación o reposición. Si el alquiler corresponde únicamente a accesorios, el cliente será responsable en su totalidad por cualquier daño o pérdida del artículo. Retrasos en devolución podrán generar cargos adicionales.
