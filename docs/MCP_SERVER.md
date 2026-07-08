# Servidor MCP

## Objetivo

El servidor MCP expone herramientas autenticadas para que Codex o Claude Code consulten y operen capacidades clave de Tembleques Camila. Las tools corresponden a las historias marcadas como `[MCP]` en el documento A13.

## Ejecucion local

```bash
cd mcp-server
bun install
MCP_BACKEND_URL=http://localhost:3000 MCP_ADMIN_TOKEN=mock-admin-token MCP_CLIENT_TOKEN=mock-client-token bun run start
```

## Configuracion para Codex o Claude Code

El comando importable es:

```bash
bun /ruta/al/repo/mcp-server/src/index.ts
```

Variables requeridas:

- `MCP_BACKEND_URL`: URL del backend Hono.
- `MCP_ADMIN_TOKEN`: token Bearer con rol administrador.
- `MCP_CLIENT_TOKEN`: token Bearer de cliente para tools de usuario.

## Seguridad

Las tools administrativas usan `MCP_ADMIN_TOKEN`. Las tools de cliente usan `MCP_CLIENT_TOKEN`. Las tools publicas no envian token salvo que lo requieran por contexto. El servidor MCP no almacena secretos ni imprime tokens.

## Tools principales

- `admin.dashboard.summary`
- `catalog.products.search`
- `catalog.availability.check`
- `rentals.draft.create`
- `payments.checkout.create`
- `rentals.mine.list`
- `rentals.pending.cancel`
- `admin.rentals.list`
- `admin.rentals.status.update`
- `admin.calendar.range`
- `admin.products.upsert`
- `admin.inventory.variantMaintenance.set`
- `admin.users.search`
- `admin.users.detail`
- `reports.operations.generate`
- `security.audit.search`
- `ops.health.check`
- `payments.reconcile.run`
