# Avance 15 - Entrega Semestral

## Enlaces de entrega

- Repositorio: https://github.com/notSoEliel/TEMBLEQUES-CAMILA-WEB
- Rama de integracion: `staging`
- GitHub Project: https://github.com/users/notSoEliel/projects/3
- Despliegue frontend staging: https://temblequescamila.vercel.app
- Despliegue backend staging: https://backend-production-e696.up.railway.app
- Healthcheck backend: https://backend-production-e696.up.railway.app/health
- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- Healthcheck MCP: https://mcp-server-production-321a.up.railway.app/health

## Estado del avance

El proyecto integra funcionalidades de cliente, administracion, checkout, inventario, cupones, mantenimiento, reportes, contratos PDF, contacto, auditoria de clientes e internacionalizacion. Para el Avance 15 se agregan los elementos exigidos por la rubrica: servidor MCP autenticado, proceso de QA, pruebas E2E ampliadas, tablero GitHub Projects y despliegue remoto actualizado.

## Demo de 5 minutos

1. Presentar el problema: alquiler artesanal de vestimenta folklorica con inventario, fechas, pagos y seguimiento manual.
2. Mostrar la solucion: catalogo, disponibilidad por fechas, carrito, checkout y perfil de cliente.
3. Mostrar administracion: inventario, reservas, clientes, mensajes, cupones, mantenimiento, reportes y contratos.
4. Mostrar calidad: GitHub Project, issues, PRs, CI y Playwright.
5. Mostrar MCP: tools remotas por Streamable HTTP e importables por `stdio` desde Codex o Claude Code para consultar y operar datos bajo autenticacion.

## Ruta de demostracion recomendada

1. Abrir https://temblequescamila.vercel.app y navegar a catalogo.
2. Filtrar una pieza, abrir detalle, elegir talla y fechas.
3. Agregar al carrito, aceptar terminos y completar pago demo.
4. Entrar como owner mock o usuario con rol `owner` y revisar reservas.
5. Descargar contrato PDF desde una reserva.
6. Revisar mensajes de contacto, clientes, reportes y cupones.
7. Ejecutar una tool MCP de lectura, por ejemplo `ops.health.check` o `catalog.products.search`, usando https://mcp-server-production-321a.up.railway.app/mcp.
8. Mostrar GitHub Project con tickets Done, En progreso y Backlog.

## Responsabilidades para presentacion

- Frontend: React 19, rutas, i18n, shadcn/Radix, estados de error y mobile.
- Backend: Bun, Hono, Mongoose, Clerk, Stripe, cron de liberacion y PDFs.
- MCP: autenticacion por token, Streamable HTTP remoto, modo `stdio` local, tools y relacion con historias A13.
- QA: Playwright deterministico, CI, typecheck y checklist de revision.
- Deploy: variables, servicios remotos, base de datos y limitaciones del plan gratuito.
