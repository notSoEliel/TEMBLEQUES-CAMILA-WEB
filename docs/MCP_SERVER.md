# Servidor MCP

## Objetivo y URL única

El servidor MCP expone las historias H83–H100 como tools para Codex y otros clientes MCP. Está desplegado en Railway dentro del proyecto académico `tembleques-camila-staging`; aunque Railway etiqueta técnicamente el entorno como `production`, en este proyecto se trata como staging.

La URL canónica es:

```text
https://mcp-server-production-321a.up.railway.app/mcp
```

No existen URLs distintas para clientes y administradores. El servidor determina el acceso mediante el principal de la solicitud:

| Principal | Autenticación | Acceso |
|---|---|---|
| `guest` | Ninguna | Catálogo y disponibilidad |
| Usuario humano | OAuth con Clerk + PKCE | Tools según el rol real de Clerk |
| Servicio | API key | CI, GitHub Actions e integraciones internas |

## Experiencia para clientes de IA

### Consulta pública

Un cliente MCP puede conectarse a la URL y consultar sin configuración adicional:

- `catalog.products.search`
- `catalog.availability.check`

No se necesita login ni API key. La respuesta pública se genera mediante una lista blanca y no incluye nombres de clientes, correos, IP, User-Agent, tokens, pagos ni detalles internos de reservas.

### Cliente autenticado

Cuando el usuario intenta consultar sus reservas, crear una reserva, crear checkout o cancelar una reserva pendiente, el servidor responde con el challenge OAuth si todavía es guest. Un cliente MCP compatible inicia el flujo de Clerk; otros clientes muestran una acción como `Connect`, `Authorize` o `Needs login`.

El usuario no escoge su rol. MCP obtiene el `userId` de Clerk, consulta el rol real y calcula los scopes MCP. La identidad nunca se convierte en administrativa por una cabecera enviada por el cliente.

### Administrador autenticado

Un administrador utiliza la misma URL. Después del login, Clerk determina si es `owner`, `operator`, `inventory` o `support`. El listado de tools se filtra según el rol y el backend vuelve a verificar el permiso antes de ejecutar la operación.

ChatGPT, Codex, Claude y otras IAs no tienen necesariamente la misma interfaz de conexión. Algunos clientes aceptan la URL directa y descubren OAuth; otros requieren crear primero una app, conector o integración. Esto es una diferencia del cliente MCP, no una razón para debilitar la autenticación del servidor.

## Autenticación y autorización

### Guest explícito

Una solicitud sin `Authorization` recibe únicamente:

```text
catalog.read
availability.read
```

`MCP_AUTH_REQUIRED=false` ya no concede scopes administrativos. La variable se mantiene solo por compatibilidad de configuración antigua y nunca cambia el guest a owner.

Una tool protegida llamada por guest responde `401` con `WWW-Authenticate` y la URL de metadata del recurso protegido.

### OAuth con Clerk

El servidor acepta OAuth de Clerk mediante Authorization Code + PKCE. La configuración OAuth solicita scopes estándar:

```text
openid profile email public_metadata
```

Los scopes MCP de negocio son internos. Se derivan del rol de Clerk y no se confían al contenido de la solicitud.

La metadata del recurso protegido publica la matriz completa de scopes MCP en `scopes_supported` para que los clientes compatibles puedan descubrirla. Esa publicación es descriptiva; los scopes efectivos siguen limitados por el rol real de Clerk o por el principal de servicio.

MCP valida mediante Clerk:

- firma del token;
- issuer;
- audiencia/recurso MCP;
- expiración;
- tipo `mcp_access`;
- usuario autenticado.

MCP no reenvía el token OAuth al backend. Para cada llamada privada crea una aserción EdDSA de 60 segundos con `sub`, issuer, audiencia, `requestId`, `iat`, `exp` y `jti`. El backend valida la aserción, carga el usuario por `clerkId` y aplica sus permisos reales.

### API keys de servicio

Las API keys son exclusivamente para máquinas:

- `MCP_ADMIN_API_KEY`: servicio administrativo para CI y mantenimiento.
- `MCP_CLIENT_API_KEY`: servicio con scopes de cliente para pruebas automatizadas.

Las claves internas del backend tienen funciones separadas:

- `MCP_BACKEND_ADMIN_TOKEN`: identidad de servicio owner para llamadas internas de CI.
- `MCP_BACKEND_CLIENT_TOKEN`: identidad de servicio client para compatibilidad de pruebas.
- `MCP_BACKEND_MCP_TOKEN`: credencial de transporte del puente OAuth MCP→backend; no representa al usuario.

Las API keys y los tokens internos no se incluyen en logs, respuestas, issues, PRs ni documentación con valores reales.

## Roles y scopes MCP

| Rol | Scopes principales | Restricción importante |
|---|---|---|
| `client` | `catalog.read`, `availability.read`, `rentals.create`, `rentals.read.own`, `rentals.cancel.own`, `payments.create` | Solo sus propias reservas |
| `owner` | Todos los scopes administrativos aprobados | Es el único rol con gestión de roles, auditoría global y conciliación |
| `operator` | Dashboard, reservas, usuarios, reportes, observabilidad e incidencias | No edita productos ni gestiona roles |
| `inventory` | Inventario, mantenimiento, productos y lectura de reservas | No gestiona usuarios ni roles |
| `support` | Dashboard, reservas, usuarios, contactos e incidencias | No concilia pagos ni edita inventario |

El valor legacy `admin` se normaliza a `owner` únicamente en el backend. No es un rol MCP visible.

## Matriz de tools

| Historia / issue | Nombre en código | Nombre natural | Acceso | Scope | Rol de negocio | OAuth | Clerk | Ubicación | Prueba sencilla |
|---|---|---|---|---|---|---:|---:|---|---|
| H83 / #109 | `admin.dashboard.summary` | Resumen administrativo | Admin | `dashboard.read` | owner, operator, inventory, support | Sí | Sí | `mcp-server/src/server.ts` | `tools/list` por rol |
| H84 / #110 | `catalog.products.search` | Buscar productos | Público | `catalog.read` | guest y todos los roles | No | No | `mcp-server/src/server.ts` | POST sin token |
| H85 / #111 | `catalog.availability.check` | Consultar disponibilidad | Público | `availability.read` | guest y todos los roles | No | No | `mcp-server/src/server.ts` | POST sin token |
| H86 / #112 | `rentals.draft.create` | Crear reserva pendiente | Cliente | `rentals.create` | client | Sí | Sí | `mcp-server/src/server.ts` | Usuario crea su reserva |
| H87 / #113 | `payments.checkout.create` | Crear checkout | Cliente | `payments.create` | client | Sí | Sí | `mcp-server/src/server.ts` | Usuario crea checkout propio |
| H88 / #114 | `rentals.mine.list` | Consultar mis reservas | Cliente | `rentals.read.own` | client | Sí | Sí | `mcp-server/src/server.ts` | No devuelve reservas ajenas |
| H89 / #115 | `rentals.pending.cancel` | Cancelar reserva pendiente | Cliente | `rentals.cancel.own` | client | Sí | Sí | `mcp-server/src/server.ts` | Cancela solo la propia |
| H90 / #116 | `admin.rentals.list` | Listar reservas | Admin | `reservations.read` | owner, operator, inventory, support | Sí | Sí | `mcp-server/src/server.ts` | Operator puede leer |
| H91 / #117 | `admin.rentals.status.update` | Cambiar estado de reserva | Admin | `reservations.write` | owner, operator | Sí | Sí | `mcp-server/src/server.ts` | Support recibe 403 |
| H92 / #118 | `admin.calendar.range` | Consultar calendario | Admin | `reservations.read` | owner, operator, inventory, support | Sí | Sí | `mcp-server/src/server.ts` | Consulta por fechas |
| H93 / #119 | `admin.products.upsert` | Crear o editar producto | Admin | `products.write` | owner, inventory | Sí | Sí | `mcp-server/src/server.ts` | Operator recibe 403 |
| H94 / #120 | `admin.inventory.variantMaintenance.set` | Mantener variante | Admin | `maintenance.write` | owner, inventory | Sí | Sí | `mcp-server/src/server.ts` | Inventory puede editar |
| H95 / #121 | `admin.users.search` | Buscar clientes | Admin | `users.read` | owner, operator, support | Sí | Sí | `mcp-server/src/server.ts` | Support puede leer |
| H96 / #122 | `admin.users.detail` | Detalle de cliente | Admin | `users.read` | owner, operator, support | Sí | Sí | `mcp-server/src/server.ts` | Datos sensibles filtrados |
| H97 / #123 | `reports.operations.generate` | Reporte operativo | Admin | `reports.read` | owner, operator | Sí | Sí | `mcp-server/src/server.ts` | Summary sin secretos |
| H98 / #124 | `security.audit.search` | Auditoría global | Admin | `audit.read` | owner | Sí | Sí | `mcp-server/src/server.ts` | Operator recibe 403 |
| H99 / #125 | `ops.health.check` | Salud técnica | Admin | `observability.read` | owner, operator | Sí | Sí | `mcp-server/src/server.ts` | Respuesta redactada |
| H100 / #126 | `payments.reconcile.run` | Conciliación de pagos | Admin | `payments.reconcile` | owner | Sí | Sí | `mcp-server/src/server.ts` | Espera H45 / #54 |

## Configuración por ambiente

### Local y CI con API keys

```bash
cd mcp-server
bun install
MCP_BACKEND_URL=http://localhost:3000 \
MCP_ADMIN_API_KEY='clave-interna' \
MCP_CLIENT_API_KEY='clave-interna' \
MCP_BACKEND_ADMIN_TOKEN='credencial-interna' \
MCP_BACKEND_CLIENT_TOKEN='credencial-interna' \
MCP_ALLOWED_ORIGIN=http://localhost:5173 \
PORT=3900 \
bun run start
```

Para probar OAuth real en staging se añaden, desde el gestor de secretos del ambiente:

```text
MCP_OAUTH_ENABLED=true
CLERK_SECRET_KEY
MCP_OAUTH_ISSUER=https://<dominio-mcp>
MCP_RESOURCE_URL=https://<dominio-mcp>/mcp
MCP_OAUTH_AUDIENCE=https://<dominio-mcp>/mcp
MCP_CLERK_OAUTH_ISSUER=https://<instancia-clerk>.clerk.accounts.dev
MCP_CLERK_OAUTH_CLIENT_ID
MCP_CLERK_OAUTH_CLIENT_SECRET
MCP_CLERK_OAUTH_REDIRECT_URI=https://<dominio-mcp>/oauth/clerk/callback
MCP_OAUTH_SIGNING_PRIVATE_KEY
MCP_OAUTH_SIGNING_PUBLIC_KEY
MCP_OAUTH_ACCESS_TOKEN_TTL_SECONDS=600
MCP_OAUTH_REFRESH_TOKEN_TTL_SECONDS=2592000
MCP_BACKEND_MCP_TOKEN
MCP_IDENTITY_PRIVATE_KEY
MCP_IDENTITY_ISSUER=tembleques-camila-mcp
MCP_BACKEND_AUDIENCE=tembleques-camila-backend
```

El backend necesita los mismos valores públicos o internos correspondientes:

```text
MCP_BACKEND_MCP_TOKEN
MCP_IDENTITY_PUBLIC_KEY
MCP_IDENTITY_ISSUER
MCP_BACKEND_AUDIENCE
```

La clave privada solo existe en Railway en el servicio MCP. La clave pública solo existe en el backend. Ninguna se guarda en el repositorio.

### Bridge OAuth MCP

El servidor publica:

```text
GET /.well-known/oauth-protected-resource/mcp
GET /.well-known/oauth-protected-resource
GET /.well-known/oauth-authorization-server
GET /.well-known/oauth-authorization-server/mcp
POST /oauth/register
GET /oauth/authorize
POST /oauth/token
POST /oauth/revoke
```

El recurso protegido anuncia al propio servidor MCP como Authorization Server. Esto es intencional: Clerk no acepta los scopes de negocio del MCP (`dashboard.read`, `payments.reconcile`, etc.) durante Dynamic Client Registration.

El bridge implementa Authorization Code + PKCE con `S256`, registra clientes MCP públicos con redirect URI validada, redirige el login humano a Clerk usando scopes OIDC estándar, valida el `id_token` y el `userinfo`, consulta el rol real en `publicMetadata` y emite un access token MCP EdDSA. El access token dura 10 minutos por defecto y el refresh token es opaco, rotativo y revocable.

El bridge nunca recibe ni almacena contraseñas. Los authorization codes, transacciones y refresh sessions se mantienen en memoria y expiran; un reinicio invalida las sesiones y obliga a autorizar de nuevo. Para producción multi-instancia se debe sustituir ese almacén por Redis o una colección persistente con TTL y bloqueo atómico.

En Clerk Development/Staging se configura una OAuth Application confidencial exclusivamente para el bridge, con callback `/oauth/clerk/callback`, `pkce_required=true`, consentimiento habilitado y scopes `openid profile email public_metadata`. Los clientes MCP no se registran directamente en Clerk.

## Smoke reproducible

El smoke transversal corresponde a `APOYO - QA - Smoke tests de herramientas MCP`, issue #64.

Valida:

- guest sin token recibe catálogo y disponibilidad;
- guest recibe `401` para tools protegidas;
- `tools/list` guest devuelve 2 tools;
- API key administrativa devuelve 18 tools;
- API key cliente devuelve únicamente las 6 tools de cliente;
- creación, lectura, checkout y cancelación con identidad de servicio de CI;
- tools administrativas y scopes;
- DTOs sin IP, User-Agent ni secretos;
- limpieza de productos y reservas temporales;
- OAuth real cuando `E2E_MCP_OAUTH_TOKEN` está configurado en staging;
- filtrado de las seis tools de cliente;
- creación de un borrador con identidad OAuth;
- creación de Checkout Session sin completar el pago;
- cancelación de la reserva pendiente;
- comprobación de que la reserva temporal no queda activa.

### Smoke OAuth de cliente

El test OAuth se activa únicamente cuando existe `E2E_MCP_OAUTH_TOKEN`. El token debe ser temporal, pertenecer a una cuenta de staging y entregarse mediante el gestor de secretos o el entorno local protegido. Se utiliza solo en memoria y no se guarda en el repositorio, artefactos, logs ni issues.

El flujo no introduce datos de tarjeta ni abre Checkout. Comprueba que la identidad OAuth pueda consultar catálogo y disponibilidad, crear una reserva pendiente propia, generar una Checkout Session y cancelar la reserva antes de cualquier pago. Si la creación ocurre y un paso posterior falla, el test intenta cancelar la reserva en el bloque de limpieza; una limpieza fallida debe marcar el smoke como fallido.

Esta prueba complementa la validación con API keys de servicio. La API key demuestra compatibilidad máquina-a-máquina; OAuth demuestra identidad humana, scopes solicitados y pertenencia de la reserva al usuario autenticado. Ninguna de las dos pruebas sustituye al E2E de Stripe que confirma el pago y el webhook.

Antes de cerrar H83–H100 se exige CI verde, typecheck, pruebas, deployment exitoso, smoke remoto y evidencia enlazada entre historia, issue, PR, commit, workflow y deployment. H100 / #126 permanece condicionado a H45 / #54.
