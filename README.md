# Tembleques Camila

Plataforma web de alquiler de vestimenta típica panameña y accesorios folclóricos. Permite a clientes explorar el catálogo, reservar productos por fechas, aceptar términos de uso y pagar en línea. Incluye un panel de administración separado para gestionar inventario, reservas y usuarios.

---

## Descripción del Proyecto

Tembleques Camila digitaliza el proceso de alquiler de vestimenta típica panameña (polleras, vestuario masculino, trajes infantiles, tembleques y accesorios) que tradicionalmente se gestionaba de forma manual.

### Modelo de Negocio

El sistema funciona bajo un esquema de **alquiler por fechas**. El cliente selecciona un producto, elige un rango de fechas, acepta los términos de responsabilidad sobre el artículo y paga en línea mediante Stripe. Cada pieza puede ser alquilada múltiples veces, generando ingresos recurrentes sobre un inventario reutilizable.

### Categorías de Productos

- Polleras (montuna y de gala)
- Vestuario masculino tipico
- Vestuario infantil
- Tembleques artesanales
- Accesorios (peinetas, cadenas, joyería)
- Paquetes completos para eventos

---

## Arquitectura

El sistema está dividido en tres servicios independientes, todos orquestados mediante Docker Compose:

```
parcial-dsix/
  docker-compose.yml       # Orquestación de los 3 servicios
  .env                     # Variables de entorno
  backend/                 # API REST (Bun + Hono + MongoDB)
  frontend/                # Interfaz web (React + Vite + shadcn/ui)
```

### Diagrama de Servicios

```mermaid
graph TD
    Browser(["Navegador"])

    subgraph Docker["Red Docker: tembleques_network"]
        FE["Frontend\nReact + Vite\n:5173"]
        BE["Backend\nBun + Hono\n:3000"]
        DB[("MongoDB 7\n:27017")]
        VOL[("Volumen\nmongodb_data")]
    end

    Browser -->|"HTTP"| FE
    FE -->|"/api proxy"| BE
    BE --> DB
    DB --- VOL
```

### Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19, React Router 7, Vite 6 |
| **UI** | TailwindCSS v4, shadcn/ui, Lucide Icons |
| **Tema** | OKLCH Neobrutalista (variables CSS en `index.css`) |
| **Backend** | Bun runtime, Hono framework |
| **Validacion** | Zod |
| **Base de Datos** | MongoDB 7 via Mongoose |
| **Autenticación** | JWT (jsonwebtoken + bcryptjs) |
| **Pagos** | Stripe Checkout Sessions |
| **Contenedores** | Docker + Docker Compose |

---

## Cómo Funciona

### Flujo del Cliente

1. El usuario explora el catálogo y filtra por categoría, talla o precio.
2. Selecciona un producto y ve su disponibilidad.
3. Elige fechas de inicio y devolución.
4. Lee y acepta los términos y condiciones mediante un checkbox obligatorio — el botón de pago permanece deshabilitado hasta la aceptación.
5. Se registra la aceptación en base de datos con timestamp, IP y user agent.
6. Paga mediante Stripe Checkout. En modo demo (sin clave real de Stripe), el pago se simula automáticamente.
7. Recibe una pantalla de confirmación con los detalles de la reserva.

### Flujo del Administrador

El panel de administración vive en `/admin` y es completamente independiente del sitio cliente. Requiere una cuenta con rol `admin`.

- **Dashboard**: KPIs en tiempo real (reservas activas, ingresos del mes, próximas devoluciones, alertas de daños).
- **Inventario**: CRUD completo de productos. Crear, editar, marcar como disponible/en mantenimiento, eliminar.
- **Reservas**: Ver todas las reservas con filtros por estado. Avanzar el ciclo de vida: Pendiente → Pagado → Confirmado → Entregado → Devuelto.
- **Usuarios**: Lista de clientes con historial expandible de alquileres por cliente.

### Estados de una Reserva

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> paid
    pending --> cancelled
    paid --> confirmed
    paid --> cancelled
    confirmed --> delivered
    confirmed --> cancelled
    delivered --> returned
    delivered --> late
    delivered --> damaged
    late --> returned
    late --> damaged
    returned --> [*]
    damaged --> [*]
    cancelled --> [*]
```

### Protección contra Doble Reserva

El backend valida disponibilidad en el momento de crear la sesión de Stripe, no solo al crear la reserva. Esto previene condiciones de carrera donde dos usuarios podrían reservar el mismo producto para las mismas fechas de forma concurrente.

---

## Base de Datos

Cuatro colecciones en MongoDB:

| Colección | Propósito |
|---|---|
| `users` | Clientes y administradores. Indice unico en `email`. |
| `products` | Catálogo con stock, categoría, precio y imágenes. Indices en `category`, `stock`, `condition_status`. |
| `rentals` | Reservas con estado, fechas y referencia al pago de Stripe. Indice compuesto en `product_id`, `start_date`, `end_date`. |
| `termsacceptances` | Registro de aceptación de términos por reserva (timestamp, IP, user agent). |

---

## Inicio Rápido

### Requisitos

- Docker Desktop instalado y corriendo
- Git

### 1. Clonar y configurar

```bash
git clone <repo-url>
cd parcial-dsix

# Copiar las variables de entorno
cp .env.example .env
```

### 2. Levantar el sistema

```bash
docker compose up --build
```

Este comando construye las imágenes de frontend y backend, espera a que MongoDB esté listo (health check), ejecuta el seed automático y levanta los tres servicios.

### 3. Acceder

| Servicio | URL |
|---|---|
| Sitio web (cliente) | http://localhost:5173 |
| Panel administrador | http://localhost:5173/admin |
| API REST | http://localhost:3000 |

### Cuentas Precargadas

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | `admin@tembleques.com` | `admin123` |
| Cliente demo | `cliente@demo.com` | `demo123` |

### Comandos Útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Ver logs de un servicio específico
docker compose logs -f backend
docker compose logs -f frontend

# Detener los contenedores
docker compose down

# Detener y borrar la base de datos (reset completo)
docker compose down -v

# Reiniciar un servicio específico
docker compose restart backend
```

---

## Variables de Entorno

| Variable | Descripción | Default |
|---|---|---|
| `MONGO_URI` | URI de conexión a MongoDB | `mongodb://mongodb:27017/tembleques_camila` |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT | Cambiar en producción |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (modo test) | Placeholder (activa modo demo) |
| `STRIPE_WEBHOOK_SECRET` | Clave para validar webhooks de Stripe | Placeholder |
| `VITE_API_URL` | URL de la API desde el frontend | `http://localhost:3000` |

---

## Estructura del Código

```
backend/src/
  index.ts                  # Servidor Hono, rutas montadas, arranque
  db.ts                     # Conexión MongoDB con reintentos
  seed.ts                   # Datos iniciales (admin + 12 productos)
  models/
    User.ts                 # Schema de usuarios con roles
    Product.ts              # Schema de productos con categorías
    Rental.ts               # Schema de reservas con 8 estados
    TermsAcceptance.ts      # Registro de aceptación de términos
  routes/
    auth.ts                 # POST /register, POST /login, GET /me
    products.ts             # GET / (filtros), GET /:id, GET /:id/availability
    rentals.ts              # POST /, GET /my, GET /:id
    admin.ts                # Dashboard, CRUD productos, gestion reservas
    stripe.ts               # Checkout session, webhook
  middleware/
    auth.ts                 # Verificacion JWT, guard de admin
  services/
    availability.ts         # Validación de solapamiento de fechas
    rental.ts               # Cálculo de totales, creación, transiciones de estado

frontend/src/
  index.css                 # Tema OKLCH neobrutalista (fuente de verdad de estilos)
  main.tsx                  # Entry point
  App.tsx                   # Router y rutas protegidas
  hooks/
    useAuth.tsx             # Contexto de autenticación JWT con localStorage
  services/
    api.ts                  # Capa de acceso a todos los endpoints del backend
  components/
    ui/                     # Componentes shadcn/ui adaptados al tema
    layouts/
      ClientLayout.tsx      # Navbar + Footer para el sitio publico
      AdminLayout.tsx       # Sidebar para el panel de administración
  pages/
    Landing.tsx             # Página principal con hero, catálogo, FAQ
    Catalog.tsx             # Grid de productos con búsqueda y filtros
    ProductDetail.tsx       # Detalle de producto con galería
    Checkout.tsx            # Flujo de reserva con términos obligatorios
    Confirmation.tsx        # Pantalla de éxito post-pago
    Login.tsx               # Inicio de sesión
    Register.tsx            # Registro de cuenta
    Profile.tsx             # Perfil y historial de reservas
    admin/
      Dashboard.tsx         # KPIs y alertas
      Inventory.tsx         # CRUD de productos
      Reservations.tsx      # Gestion de reservas con transiciones
      Users.tsx             # Lista de clientes con historial
```

---

## API Endpoints

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Registro de usuario |
| `POST` | `/api/auth/login` | No | Inicio de sesión |
| `GET` | `/api/auth/me` | JWT | Usuario autenticado |
| `GET` | `/api/products` | No | Catálogo con filtros |
| `GET` | `/api/products/:id` | No | Detalle de producto |
| `GET` | `/api/products/:id/availability` | No | Fechas ocupadas |
| `POST` | `/api/rentals` | JWT | Crear reserva |
| `GET` | `/api/rentals/my` | JWT | Mis reservas |
| `GET` | `/api/rentals/:id` | JWT | Detalle de reserva |
| `POST` | `/api/stripe/create-checkout-session` | JWT | Iniciar pago |
| `POST` | `/api/stripe/webhook` | No | Confirmar pago |
| `GET` | `/api/admin/dashboard` | Admin | KPIs |
| `POST` | `/api/admin/products` | Admin | Crear producto |
| `PUT` | `/api/admin/products/:id` | Admin | Editar producto |
| `DELETE` | `/api/admin/products/:id` | Admin | Eliminar producto |
| `GET` | `/api/admin/rentals` | Admin | Todas las reservas |
| `PATCH` | `/api/admin/rentals/:id/status` | Admin | Cambiar estado |
| `GET` | `/api/admin/users` | Admin | Lista de clientes |
| `GET` | `/api/admin/users/:id/rentals` | Admin | Historial de cliente |

---

## Pendientes

### Funcionalidades

- [ ] **Autenticación con Clerk** — Reemplazar el JWT propio por Clerk para soportar login con Google y OTP. La arquitectura actual está preparada para esta migración.
- [ ] **Recuperación de contraseña** — Flujo de reset por email (requiere servicio de correo como Resend).
- [ ] **Carga de imágenes reales** — Integrar un servicio de almacenamiento (Cloudinary o S3) para subir fotos de productos desde el panel admin. Hoy se usan URLs de imágenes externas.
- [ ] **Calendario de disponibilidad visual** — Mostrar un calendario interactivo en el detalle del producto marcando las fechas ya ocupadas, en lugar del selector de fecha simple actual.
- [ ] **Depósito de garantía** — Implementar holds en tarjeta con Stripe para artículos de alto valor, con cobro automático por daños.
- [ ] **Penalidades por atraso** — Calculo y cobro automático cuando `status = late` supera la fecha de devolución.
- [ ] **Notificaciones** — Emails de confirmación de reserva, recordatorios de devolución y alertas al admin de nuevas reservas.
- [ ] **Filtro por fecha en catálogo** — Permitir al usuario filtrar el catálogo por fechas disponibles para ver solo los productos que puede reservar en ese rango.

### Infraestructura y Calidad

- [ ] **Testing unitario** — Cubrir los servicios críticos (`availability.ts`, `rental.ts`, calculo de totales) con pruebas usando `bun test`. Meta: 80% de cobertura en modulos de negocio.
- [ ] **Testing E2E con Playwright** — Automatizar los flujos principales: registro, login, reserva completa, bloqueo de checkout sin términos, y gestión admin.
- [ ] **Variables de entorno en producción** — Configurar secrets reales para `JWT_SECRET`, `STRIPE_SECRET_KEY` y `MONGO_URI` antes de cualquier despliegue.
- [ ] **Dockerfile de producción** — Los Dockerfiles actuales corren en modo desarrollo con hot reload. Crear variantes de producción con builds optimizados.
- [ ] **HTTPS** — Configurar certificados SSL (Let's Encrypt via Traefik o Nginx) para el despliegue en servidor.
- [ ] **Documentación de API** — Generar documentación interactiva de los endpoints (OpenAPI / Swagger).

---

## Licencia

Proyecto académico. Uso educativo.
