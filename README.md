# Tembleques Camila

Plataforma e-commerce B2C para alquiler de vestimenta folclorica panamena, con catalogo, reservas por fecha, pagos, administracion operativa, pruebas automatizadas y servidor MCP remoto.

## Integrantes

- Angelica Rodriguez - 2-751-41
- Eliel Garcia - 8-990-1192

## Enlaces de entrega

- Repositorio: https://github.com/notSoEliel/TEMBLEQUES-CAMILA-WEB
- GitHub Project: https://github.com/users/notSoEliel/projects/3
- Frontend staging: https://frontend-navy-five-22.vercel.app
- Backend staging: https://backend-production-e696.up.railway.app
- Backend healthcheck: https://backend-production-e696.up.railway.app/health
- MCP remoto: https://mcp-server-production-321a.up.railway.app/mcp
- MCP healthcheck: https://mcp-server-production-321a.up.railway.app/health

## Stack

- Frontend: React 19, Vite, TypeScript, React Router v7, Tailwind CSS v4, Radix UI, Clerk.
- Backend: Bun, Hono, TypeScript, MongoDB/Mongoose, Clerk, Stripe, Svix.
- MCP: Model Context Protocol SDK, Streamable HTTP remoto y modo `stdio` local.
- QA: GitHub Actions, TypeScript, build y Playwright.
- Deploy: Vercel para frontend, Railway para backend, MongoDB y MCP.

## Documentacion principal

- [Setup local](docs/SETUP_GUIDE.md)
- [Despliegue staging](docs/DEPLOY_STAGING.md)
- [Servidor MCP](docs/MCP_SERVER.md)
- [Entrega Avance 15](docs/AVANCE_15_ENTREGA.md)
- [QA Avance 15](docs/QA_AVANCE_15.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Backend deep dive](docs/BACKEND_DEEP_DIVE.md)
- [Frontend deep dive](docs/FRONTEND_DEEP_DIVE.md)
- [Pagos y webhooks](docs/PAYMENTS_WEBHOOKS.md)
- [Operación administrativa](docs/ADMIN_OPERATIONS.md)
- [Autenticacion y Clerk](docs/AUTH_FLOW.md)
- [Seguridad y configuracion](docs/SECURITY_AND_CONFIGURATION.md)
- [Modelo de datos](docs/DATABASE_SCHEMA.md)
- [Contribucion](docs/CONTRIBUTING.md)
- [Decisiones tecnicas](docs/ADRS.md)

## Inicio rapido local

1. Instalar dependencias con Bun.

```bash
bun install
cd backend && bun install
cd ../frontend && bun install
cd ../mcp-server && bun install
```

2. Crear variables de entorno desde la plantilla.

```bash
cp .env.example .env
```

3. Levantar MongoDB local con Docker si no se usa Atlas.

```bash
docker-compose up mongodb -d
```

4. Correr backend y frontend.

```bash
cd backend && bun run dev
cd frontend && bun run dev
```

5. Correr MCP local en modo importable por Codex o Claude Code.

```bash
cd mcp-server
MCP_BACKEND_URL=http://localhost:3000 \
MCP_AUTH_REQUIRED=false \
MCP_BACKEND_ADMIN_TOKEN=mock-admin-token \
MCP_BACKEND_CLIENT_TOKEN=mock-client-token \
bun run start:stdio
```

## MCP remoto

El MCP desplegado en Railway expone 18 tools por Streamable HTTP en:

```text
https://mcp-server-production-321a.up.railway.app/mcp
```

Healthcheck:

```text
https://mcp-server-production-321a.up.railway.app/health
```

Para detalles de autenticacion, tools y pruebas, ver [docs/MCP_SERVER.md](docs/MCP_SERVER.md).

## Flujo de trabajo

- La rama de integracion es `staging`.
- No se trabaja directo sobre `master` o `main`.
- Cada funcionalidad debe tener issue en GitHub Project.
- Cada PR debe apuntar a `staging`, pasar CI y vincular issue cuando corresponda.
- El GitHub Project debe reflejar el estado real: Todo, In progress y Done.

## Variables sensibles

No subir `.env` reales al repositorio. Usar `.env.example` como plantilla compartible y configurar secretos reales en Railway/Vercel o en archivos locales ignorados por Git.
