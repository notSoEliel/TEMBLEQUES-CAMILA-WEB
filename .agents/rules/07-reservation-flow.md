# Reglas del Flujo de Reserva - Tembleques Camila

El proceso de reserva debe ser intuitivo, rápido y seguro.

## Estados de Reserva Permitidos
- `pending`: Creada pero no pagada.
- `paid`: Pago recibido vía Stripe.
- `confirmed`: Validada por admin (opcional dependiendo del flujo exacto).
- `delivered`: Producto entregado al cliente.
- `returned`: Producto devuelto a la tienda.
- `late`: Producto no devuelto en la fecha acordada.
- `damaged`: Producto devuelto con daños.
- `cancelled`: Reserva cancelada.

## Flujo Completo del Usuario (UX)
1. **Landing / Catálogo**: El usuario explora y filtra (Tipo, Accesorios, Talla, Fecha disponible, Precio).
2. **Producto**: Selecciona un producto específico y visualiza detalles.
3. **Fecha**: Escoge fecha de inicio y fin en un calendario simple.
4. **Términos**: Lee y acepta los términos y condiciones (checkbox obligatorio).
5. **Stripe**: Realiza el pago.
6. **Confirmación**: Visualiza pantalla de éxito con detalles de la reserva.

## Reglas de Negocio
- **No Doble Reserva**: El sistema debe impedir estrictamente que un mismo producto sea reservado para fechas superpuestas. Validar disponibilidad real en backend antes de ir a Stripe.
- **Tiempo**: El proceso de reserva debe poder completarse en menos de 3 minutos.
