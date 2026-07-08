# QA Avance 15

## Proceso de QA

El proceso de QA combina revision por PR, CI y pruebas E2E deterministicas:

1. Todo cambio entra por rama feature hacia `staging`.
2. Cada PR debe vincular al menos un issue del GitHub Project.
3. CI ejecuta instalacion, typecheck de frontend, build de backend y Playwright.
4. Un PR no debe mergearse si falla typecheck, build o pruebas E2E.
5. Antes de la demo se ejecuta la lista local de verificacion.

## Comandos locales

```bash
bun install
cd frontend && bun x tsc --noEmit
cd ../backend && bun x tsc --noEmit
cd .. && bun run test:e2e
```

## Cobertura E2E requerida

- Autenticacion mock de cliente y administrador.
- Catalogo, busqueda y detalle de producto.
- Carrito, checkout, aceptacion de terminos y pago demo.
- Contacto publico y almacenamiento de mensajes.
- Perfil editable y persistente.
- Selector de idioma en rutas publicas.
- Panel admin: dashboard, inventario, reservas, clientes, contactos, cupones y reportes.
- Contrato PDF desde reserva administrativa cuando exista una reserva disponible.

## Checklist manual de demo

- La URL remota abre sin errores visibles.
- El backend responde `/api/products`.
- Clerk esta configurado o el modo mock funciona para demo.
- MongoDB tiene datos semilla.
- Stripe esta en modo demo o test.
- Cloudinary permite subida o las imagenes existentes cargan.
- GitHub Project muestra tickets Done, En progreso y Backlog.
- El MCP se puede ejecutar localmente con variables de entorno.
