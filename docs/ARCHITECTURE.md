# Arquitectura Técnica: Tembleques Camila

Este documento detalla la arquitectura de software, la infraestructura y el flujo de datos de la plataforma Tembleques Camila. El sistema ha sido diseñado bajo los principios de escalabilidad, rendimiento extremo y gestión de estados asíncronos robusta, utilizando un stack moderno basado en **React 19**, **Bun** y **Hono**.

---

## 1. Visión General del Sistema

Tembleques Camila no es solo un e-commerce; es una aplicación web de misión crítica diseñada para digitalizar un proceso tradicional de alquiler folclórico. La arquitectura se basa en una separación clara de responsabilidades, orquestada mediante contenedores Docker para garantizar la paridad entre los entornos de desarrollo, staging y producción.

### Objetivos Arquitectónicos
- **Latencia Mínima**: Uso de Bun y Hono para una respuesta del servidor casi instantánea.
- **Estado Asíncrono Robusto**: Gestión de pagos y disponibilidad en tiempo real.
- **Escalabilidad Horizontal**: Servicios desacoplados listos para ser escalados independientemente.
- **Integridad de Datos**: Esquemas estrictos de Mongoose y validación Zod en todas las capas.

---

## 2. Diagrama de Infraestructura Global

El ecosistema de Tembleques Camila reside en una red virtual de Docker (`tembleques_network`), donde cada servicio está aislado pero interconectado mediante un sistema de nombres de DNS interno.

```mermaid
graph TD
    subgraph "External Cloud Services"
        Clerk[Clerk: Identity & Auth]
        Stripe[Stripe: Financial Operations]
        Cloudinary[Cloudinary: Media Assets]
        Svix[Svix: Webhook Reliability]
    end

    subgraph "User Environment"
        Browser([Web Browser])
    end

    subgraph "Docker Orchestration (tembleques_network)"
        Vite[Vite Proxy / Frontend]
        Hono[Hono API / Backend]
        Mongo[(MongoDB 7.0)]
        Redis[(Redis Cache - Proyectado)]
    end

    %% Frontend a Backend
    Browser -->|Autenticación (JWT)| Hono
    Browser -->|Solicita firma temporal| Hono
    Browser -->|Pedidos y Pagos| Hono

    %% Backend a Externos
    Hono -->|CRUD de Datos| Mongo
    Hono -->|Validar Pagos| Stripe
    Stripe -->|Webhooks| Hono

    %% Servicios Directos desde Cliente
    Browser -->|Autenticación Auth| Clerk
    Browser -->|Subida firmada JPG/PNG/WEBP| Cloudinary
```

---

## 3. Desglose del Stack Tecnológico

### A. Frontend: La Revolución de React 19
El frontend utiliza **React 19**, aprovechando las nuevas capacidades de renderizado y el manejo simplificado de transacciones.
- **Vite 6**: Actúa como el motor de construcción (bundler) y servidor de desarrollo. Una pieza clave de nuestra arquitectura es el **Vite Proxy**, que redirige todas las peticiones al path `/api` hacia el backend en el puerto 3000, eliminando problemas de CORS en desarrollo y simplificando la configuración de red.
- **React Router v7**: Gestiona la navegación y la sincronización de estados con la URL (Rutas de Verdad).
- **Tailwind CSS v4**: Motor de estilos de última generación para una UI premium y de alto rendimiento.

### B. Backend: Bun + Hono
Elegimos **Bun** como runtime por su velocidad de ejecución y su ecosistema integrado (test runner, bundler, package manager). 
- **Hono**: Un framework ultra-ligero y rápido que nos permite definir rutas con tipado fuerte. Su arquitectura basada en middlewares nos permite inyectar seguridad (Clerk), validación (Zod) y registro de logs de forma modular.
- **Zod**: Garantiza que ningún dato malformado llegue a la base de datos, validando tanto las entradas del usuario como las respuestas de servicios externos. Se utiliza en middlewares para descartar requests malformadas antes de que toquen la lógica de negocio.

### C. Persistencia: MongoDB 7 con Mongoose
Utilizamos **MongoDB** para una gestión flexible de productos folclóricos que tienen atributos variables. La integración se realiza mediante **Mongoose**, que nos proporciona:
- **ODM (Object Document Mapping)**: Una capa de abstracción orientada a objetos con validaciones de schema.
- **Virtuals**: Propiedades computadas que no se almacenan en la BD (ej: `total_stock`, `is_available`, `price_range` en Product).
- **Índices**: Optimización de queries críticas (ej: buscar por categoría, por usuario).
- **Hooks de ciclo de vida** (pre/post): Ejecutar lógica antes o después de operaciones (ej: validaciones, auditoría).

### D. Validación: Zod + Tipado Fuerte
Todo dato que entra al backend se valida a través de **Zod** antes de ser procesado. Esta validación ocurre en:
- Middlewares de Hono (request body validation)
- Servicios de negocio (transformación de datos)
- Respuestas de API (garantizar contrato con frontend)

---

## 5. Capas de Validación y Manejo de Errores

### AppError: Error Handling Centralizado
Todos los errores aplicativos se lanzan como `AppError`, que encapsula:
- **Mensaje**: Texto legible en español para el cliente
- **statusCode**: HTTP status (401, 400, 409, etc.)
- **code**: Identificador único del error (ej: `AUTH_TOKEN_REQUIRED`, `PRODUCT_DATES_UNAVAILABLE`)

**Flujo de Error:**
```
Service → throw new AppError(...)
    ↓
Backend Request → Hono Global Handler
    ↓
Formatea a JSON { error, code }
    ↓
Frontend ErrorModal.tsx ó ErrorPage.tsx
```

### Middleware Chain de Hono
El backend procesa cada request a través de una cadena de middlewares:

1. **CORS Middleware**: Autoriza orígenes de frontend (`localhost:5173`, `frontend:5173`, prod URL).
2. **Logger Middleware**: Registra todas las peticiones en consola.
3. **DB Readiness Check**: Valida que MongoDB esté conectado (evita requests durante startup).
4. **Auth Middleware** (protegidas): 
   - Extrae token Bearer del header
   - Verifica la firma con Clerk
   - Realiza upsert del usuario en MongoDB
   - Inyecta el user context en `c.get("user")`
5. **Zod Validation** (por ruta): Valida body, query params y response antes de enviar

### Mapeo de Códigos de Error
| Código | HTTP | Situación | Manejo Frontend |
|---|---|---|---|
| `AUTH_TOKEN_REQUIRED` | 401 | Falta autenticación | Redirect a Login |
| `AUTH_TOKEN_INVALID` | 401 | Token expirado | Re-getToken de Clerk |
| `PRODUCT_DATES_UNAVAILABLE` | 409 | Fechas ocupadas | Mostrar disponibilidad |
| `RENTAL_TERMS_NOT_ACCEPTED` | 400 | No aceptó términos | Form validation inline |
| `VALIDATION_ERROR` | 400 | Schema Zod falló | Errores de form |

---

## 6. Modelos de Datos (Mongoose Schemas)

### Product: Gestión de Catálogo con Variantes
```
Product
├─ name: string
├─ category: string (ej: "Muumuu", "Montuno")
├─ description: string
├─ rental_price: number (precio base)
├─ variants: [SizeVariant]
│  ├─ size: string
│  ├─ stock: number
│  ├─ price_override?: number (opcional, si difiere del base)
│  └─ in_maintenance: boolean
├─ images: [string] (URLs de Cloudinary)
└─ deposit_settings:
   ├─ required: boolean
   └─ overrideAmount?: number

Virtuals (propiedades computadas):
├─ total_stock: suma de todas las variantes
├─ is_available: al menos 1 variante con stock > 0 y no en mantenimiento
└─ price_range: { min, max } de precios (considerando overrides)
```

### Rental: Máquina de Estados de la Reserva
```
Rental
├─ user_id: ObjectId (referencia a User)
├─ product_id: ObjectId (referencia a Product)
├─ order_group_id: string (agrupa múltiples prendas del mismo pedido)
├─ selected_size: string
├─ start_date: Date
├─ end_date: Date
├─ total: number (precio total de la reserva)
├─ balance_due: number (saldo pendiente si es reserva)
├─ payment_type: "reservation" | "full"
├─ status: RentalStatus (máquina de estados):
│  ├─ pending → reserved → paid → confirmed → delivered → returned
│  └─ (lateral: late, damaged, cancelled)
├─ payment_status: "pending" | "completed" | "failed" | "refunded"
├─ terms_accepted: boolean (flag + timestamp via TermsAcceptance)
├─ stripe_session_id: string (checkout session)
├─ stripe_payment_intent_id: string (main payment)
├─ deposit_status: DepositStatus (not_required → pending_hold → held → released/captured)
├─ late_fee_status: FeeStatus (para cargos por demora)
└─ createdAt, updatedAt: Date
```

**Máquina de Estados de Rental:**
```
pending ─→ reserved ─→ paid ─→ confirmed ─→ delivered ─→ returned ✓
                ↓                                  ↓
              cancelled                          late ─→ damaged
```

### User: Perfil de Usuario
```
User
├─ clerkId: string (ID del proveedor Clerk)
├─ email: string
├─ name: string
├─ role: "client" | "admin"
├─ phone?: string
├─ metadata:
│  ├─ ip?: string (de TermsAcceptance)
│  └─ userAgent?: string
└─ createdAt, updatedAt: Date
```

### TermsAcceptance: Auditoría de Aceptación de Términos
```
TermsAcceptance
├─ user_id: ObjectId (referencia a User)
├─ rental_id: ObjectId (referencia a Rental)
├─ accepted_at: Date
├─ ip_address: string (para cumplimiento legal)
├─ user_agent: string (navegador/dispositivo)
└─ terms_version: string
```

### Settings: Configuración Global del Negocio
```
Settings
├─ business_name: string
├─ contact_email: string
├─ late_fee_amount: number
├─ deposit_percentage: number
├─ categories: [CategoryConfig]
│  ├─ name: string
│  └─ sizes: [SizeGroupConfig]
│     ├─ group_name: string
│     └─ sizes: [string]
└─ stripe_publishable_key: string (aunque suele venir del env)
```

---

## 7. Flujo de Datos y Comunicación Interna

```mermaid
sequenceDiagram
    participant U as Usuario (Browser)
    participant V as Vite Proxy
    participant B as Backend (Hono)
    participant C as Clerk / Stripe
    participant CL as Cloudinary
    participant DB as MongoDB

    U->>V: GET /api/products?page=1
    V->>B: Redirección Interna (Proxy)
    B->>DB: Query con Paginación
    DB-->>B: Documentos + Metadata
    B-->>V: Respuesta JSON
    V-->>U: Renderizado en Cliente

    Note over U,B: Flujo de Autenticación
    U->>C: Login (Frontend SDK)
    C-->>U: JWT Session Token
    U->>V: Request con Header Bearer
    V->>B: Pasa Header
    B->>C: Verificar Token (Middleware)
    C-->>B: User Context
    B->>DB: Operación Autorizada

    Note over U,B: Flujo de imágenes firmado
    U->>B: GET /api/media/sign (admin)
    B-->>U: timestamp, upload_preset, signature, api_key y cloud_name
    U->>CL: POST /image/upload con el archivo y la firma
    CL-->>U: secure_url
    Note over U,CL: El límite de 5 MB se valida en el navegador; el backend no recibe el archivo.
```

---

## 8. Orquestación y Contenedores

El proyecto se despliega mediante **Docker Compose**, lo que nos permite levantar todo el entorno con un solo comando.

### Definición de Servicios (docker-compose.yml)
1.  **Frontend**: Expone el puerto 5173. Depende del backend para asegurar que la API esté lista antes de que el frontend intente realizar peticiones.
2.  **Backend**: Expone el puerto 3000. Utiliza un volumen para los logs y depende de la base de datos.
3.  **MongoDB**: Utiliza una imagen oficial de MongoDB 7.0 con un volumen persistente (`mongodb_data`) para evitar la pérdida de datos entre reinicios.

### El Rol del Proxy de Vite
En desarrollo, Vite intercepta las peticiones:
```javascript
// vite.config.ts (Concepto)
proxy: {
  '/api': {
    target: 'http://backend:3000',
    changeOrigin: true,
  }
}
```
Esto permite que el frontend hable con `/api/products` como si estuviera en el mismo dominio, mientras que Docker redirige esa petición al contenedor del backend de forma transparente.

---

## 9. Gestión de Estados Asíncronos

La plataforma maneja tres tipos de estados asíncronos críticos:

1.  **Disponibilidad de Productos**: Validada en tiempo real mediante un motor que consulta solapamientos de fechas en MongoDB.
2.  **Ciclo de Vida de Reservas**: Una máquina de estados (Pending -> Paid -> Confirmed -> Delivered -> Returned) que garantiza que el flujo de negocio se respete.
3.  **Confirmaciones Financieras (Webhooks)**: El backend no confirma un pago basándose en la redirección del frontend; espera una señal firmada de Stripe a través de Svix.

---

## 10. Estructura de Directorios y Responsabilidades

```text
parcial-dsix/
├── docs/                  # Documentación técnica modular
├── backend/               # Servicio de API
│   ├── src/
│   │   ├── models/        # Esquemas de datos (Product, Rental, etc.)
│   │   ├── routes/        # Definición de Endpoints y Middlewares
│   │   ├── services/      # Lógica de negocio (Availability, Stripe, Rental)
│   │   └── index.ts       # Punto de entrada y orquestación de Hono
├── frontend/              # Aplicación de cliente
│   ├── src/
│   │   ├── components/    # Átomos y moléculas de UI
│   │   ├── pages/         # Vistas principales y paneles admin
│   │   ├── services/      # Cliente API Axios/Fetch
│   │   └── hooks/         # Lógica de UI y sincronización URL
└── docker-compose.yml     # Orquestador maestro
```

---

## 11. Servicios de Negocio

El backend organiza la lógica de negocio en servicios reutilizables, separados de las rutas HTTP:

### availability.ts: Motor de Disponibilidad
Valida que las fechas seleccionadas no estén ocupadas por otras rentals.
```typescript
// Pseudo-código
function checkAvailability(productId, size, startDate, endDate) {
  // Query: ¿Existe algún Rental en conflicto?
  const overlapping = Rental.find({
    product_id: productId,
    selected_size: size,
    status: { $in: ["paid", "confirmed", "delivered"] },
    $or: [
      { start_date: { $lt: endDate }, end_date: { $gt: startDate } }
    ]
  });
  
  if (overlapping.length > 0) {
    throw new AppError("Fechas ocupadas", 409, "PRODUCT_DATES_UNAVAILABLE");
  }
}
```

### rental.ts: Lógica de Ciclo de Vida de Rentals
Orquesta transiciones de estado, calcula montos y gestiona la comunicación con Stripe.
```typescript
// Estados: pending → reserved → paid → confirmed → delivered → returned
async function createRental(userId, items, paymentType) {
  // Validar disponibilidad para cada item
  // Crear documento Rental con status "pending"
  // Calcular total, deposit, late fees
  // Retornar para que frontend inicie checkout con Stripe
}

async function confirmRental(rentalId, stripePaymentIntentId) {
  // Verificar que el PaymentIntent fue exitoso
  // Cambiar status a "paid"
  // Esperar webhook de confirmación de Stripe
}
```

### payment-rules.ts: Cálculo de Montos
Define la lógica de cálculo: precio base, depósitos, cargos por demora.
```typescript
function calculateRentalTotal(rental: IRental): number {
  const days = Math.ceil((rental.end_date.getTime() - rental.start_date.getTime()) / (1000 * 60 * 60 * 24));
  const basePrice = rental.product_id.rental_price || 0;
  const subtotal = basePrice * days;
  const deposit = rental.deposit_required ? calculateDeposit(rental) : 0;
  return subtotal + deposit;
}
```

### stripe.ts: Integración con Stripe
Crea sesiones de checkout, valida webhooks firmados y gestiona intents de pago.
```typescript
async function createCheckoutSession(rental: IRental) {
  const session = await stripe.checkout.sessions.create({
    // Aquí se envían los line_items basados en los rentals
    success_url: `${FRONTEND_URL}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${FRONTEND_URL}/cart`,
  });
  return session;
}

// Webhook handler para payment_intent.succeeded
app.post("/webhooks/stripe", async (c) => {
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();
  
  const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);
  
  if (event.type === "payment_intent.succeeded") {
    const rental = await Rental.findById(event.data.object.metadata.rental_id);
    rental.status = "paid";
    await rental.save();
  }
});
```

---

## 12. API Client del Frontend

El frontend utiliza un **API client tipado** que centraliza todas las peticiones HTTP y la integración con Clerk.

### services/api.ts: Cliente Fetch Tipado
```typescript
const API_URL = "/api"; // Proxy de Vite redirige a backend:3000

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Obtener token fresco de Clerk
  let currentToken = token;
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    try {
      const freshToken = await (window as any).Clerk.session.getToken();
      if (freshToken) currentToken = freshToken;
    } catch (e) {
      console.warn("Failed to get fresh Clerk token", e);
    }
  }

  // Inyectar Bearer token
  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  // Manejo de errores centralizado
  if (!response.ok) {
    // Si el error tiene un { error, code }, usarlo
    // Si no, generar error genérico
    throw new Error(data.error || `HTTP ${response.status}`);
  }

  return data as T;
}

// Métodos de conveniencia tipados:
export const getProducts = () => api<PaginatedResponse<IProduct>>("/products");
export const getRentals = () => api<IRental[]>("/rentals");
export const createRental = (data) => api<IRental>("/rentals", { method: "POST", body: data });
```

### Integración con Clerk
El frontend obtiene el token JWT de Clerk automáticamente en cada request, lo que permite que el backend verifique la autenticidad sin necesidad de sesiones server-side.

```typescript
// En AuthProvider (hooks/useAuth.tsx):
const { getToken: clerkGetToken } = useClerkAuth();

const token = await clerkGetToken();
// Pasar a api() helper, que lo agrega al header "Authorization: Bearer <token>"
```

---

## 13. State Management y Context API

El frontend utiliza **React Context API** para gestionar estado global:

### AuthContext: Sesión de Usuario
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  getToken: () => Promise<string | null>;
  logout: () => void;
  isLoading: boolean;
}

// AuthProvider sincroniza:
// 1. Estado de Clerk (isSignedIn, clerkUser)
// 2. Perfil de MongoDB (/api/auth/me con el token)
// 3. Token JWT fresco en cada request
```

### CartContext (Proyectado): Carrito de Compras
```typescript
// Estructura de un item de carrito:
interface CartItem {
  product_id: string;
  size: string;
  start_date: Date;
  end_date: Date;
  quantity: number;
}

// Acciones:
// - addItem(product, size, dates)
// - removeItem(product_id)
// - clearCart()
// - updateQuantity(product_id, qty)
// - getTotalPrice()
```

### Paginación Sincronizada con URL
Gracias a React Router v7, la paginación se refleja en `?page=1&limit=10` en la URL:
```typescript
// En una página de listado:
const [searchParams, setSearchParams] = useSearchParams();
const page = Number(searchParams.get("page")) || 1;

const { data: products, pagination } = await getProducts({ page, limit: 10 });

// Navegar a página anterior/siguiente:
setSearchParams({ page: page + 1 });
```

---

## 14. Escalabilidad y Futuro

La arquitectura actual permite una evolución fluida hacia:
- **Microservicios**: Separar el panel de admin de la tienda cliente si el tráfico lo requiere.
- **Edge Computing**: Hono está diseñado para correr en el Edge (Cloudflare Workers), lo que permitiría una latencia global aún menor.
- **Multi-tenant**: La base de datos y la autenticación (Clerk) están preparadas para soportar múltiples tiendas bajo la misma infraestructura si fuera necesario.

---

## 15. Seguridad Arquitectónica

1.  **Validación de Origen**: Los webhooks de Stripe se validan mediante firmas criptográficas proporcionadas por Svix.
2.  **Protección de Rutas**: Middlewares de Hono interceptan cada petición al backend para validar el token de Clerk y el rol del usuario (Admin/User).
3.  **Aislamiento de Secretos**: Todas las credenciales sensibles se inyectan a través de variables de entorno, nunca se hardcodean en el repositorio.

---

Este documento es una guía viva de la ingeniería detrás de Tembleques Camila. Para detalles de implementación específicos, consultar los módulos de `BACKEND_DEEP_DIVE.md` y `FRONTEND_DEEP_DIVE.md`.
