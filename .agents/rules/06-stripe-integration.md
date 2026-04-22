# Reglas de Integración con Stripe - Tembleques Camila

## MVP
- **Pago Online**: Implementar checkout con Stripe para procesar pagos de reservas.
- **Confirmación Automática**: El sistema debe recibir webhooks de Stripe para confirmar el pago.
- **Reserva Validada**: Una reserva solo pasa a estado `paid` o `confirmed` tras recibir un pago exitoso de Stripe.
- **Términos Obligatorios**: No se debe permitir iniciar la sesión de checkout en Stripe sin que el usuario haya aceptado explícitamente los términos y condiciones (ver `.agents/rules/08-terms-conditions.md`).

## Futuro (Preparación)
Dejar la arquitectura lista para:
- Cobro de depósito de garantía (holds en tarjeta).
- Cobro adicional por daños o roturas.
- Penalidades por atrasos en devoluciones.
