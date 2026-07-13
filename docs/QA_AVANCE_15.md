# QA Avance 15

## Proceso de QA

El proceso de QA combina revision por PR, CI y pruebas E2E deterministicas:

1. Todo cambio entra por rama feature hacia `staging`.
2. Cada PR debe vincular al menos un issue del GitHub Project.
3. CI ejecuta instalacion, typecheck de frontend, build de backend y Playwright.
4. Un PR no debe mergearse si falla typecheck, build o pruebas E2E.
5. Antes de la demo se ejecuta la lista local de verificacion.

## Reglas de gestion de issues

- Una capacidad funcional tiene un issue canonico. No se crean issues paralelos para la misma historia.
- Los issues historicos repetidos se conservan cerrados por trazabilidad y se retiran del Project si duplican al canonico; no se borran.
- Las tareas de apoyo, como Clerk real o Stripe test, se mantienen separadas cuando validan una integracion externa y no sustituyen la historia canonica.
- Cada issue debe explicar alcance, estado actual, autenticacion/autorizacion, datos sensibles, criterios de aceptacion y evidencia de cierre.
- Un issue solo pasa a Done cuando existe evidencia reproducible en codigo, pruebas, CI o despliegue. Tener un mock, una pantalla o un endpoint no basta.
- Los PR deben enlazar el issue canonico y los comentarios de cierre deben registrar comandos, resultados y limitaciones sin secretos.

## Orden de ataque QA/staging

1. H56/#61: seed repetible y separacion de bases local, CI, staging y demo.
2. H52/#80: unitarios de disponibilidad, fechas, depositos y mora.
3. H53/#81: E2E criticos con tokens mock y datos semilla CI.
4. H54/#82: CI con lint, typecheck, tests, build, E2E y artefactos.
5. #65/#66: smoke real de Clerk y Stripe en staging con cuentas test dedicadas.

El avance de una etapa no cierra automaticamente las siguientes: las integraciones externas deben probarse en el ambiente que representan.

## Comandos locales

```bash
bun install
cd frontend && bun x tsc --noEmit
cd ../backend && bun x tsc --noEmit
cd .. && bun run test:e2e
bun run lint
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

Para el seed y la separacion de ambientes, consultar [QA_SEED_AND_ENVIRONMENTS.md](./QA_SEED_AND_ENVIRONMENTS.md).
