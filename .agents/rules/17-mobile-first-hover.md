# Mobile First & Hover Accessibility

## Contexto
En dispositivos móviles no existe el estado de "hover". El uso de opacidad baja o elementos que solo aparecen al pasar el mouse degrada la experiencia del usuario en pantallas táctiles.

## Reglas
- **Visibilidad Garantizada**: Los elementos interactivos críticos (botones de edición, flechas de movimiento, eliminar) deben ser visibles permanentemente en móviles o tener un diseño que no dependa del hover.
- **Opacidad**: Evitar `opacity-0` o `opacity-50` que cambie a `100` solo en hover para acciones principales.
- **Tamaño de Toque**: Asegurar que los botones interactivos tengan un área de toque mínima de 44x44px.
- **Alternativas a Hover**: Utilizar estados activos o cambios visuales permanentes en lugar de depender de la interacción del mouse para revelar funcionalidad.
