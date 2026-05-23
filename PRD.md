# Product Requirements Document (PRD): Tembleques Camila

## 1. Resumen Ejecutivo
**Tembleques Camila** es una plataforma web premium de comercio electrónico B2C especializada en la gestión, reserva y alquiler de vestimentas típicas panameñas y accesorios folclóricos tradicionales (tales como polleras, montunos, tembleques, peinetas y joyería típica). El sistema digitaliza un proceso tradicionalmente manual de alquiler, asegurando una experiencia de usuario moderna, fluida y de alta calidad estética que refleja el valor de la identidad cultural nacional.

---

## 2. Definición del Problema
El mercado de alquiler de indumentaria folclórica en Panamá sufre de los siguientes problemas operativos y de experiencia:
- **Gestión Analógica:** Falta de visibilidad de inventario y reservas en tiempo real, resultando en sobreventa de prendas en fechas críticas (noviembre, carnavales, etc.).
- **Proceso de Reserva Ineficiente:** Interacciones tardadas a través de llamadas o mensajería de chat manual para validar tallas, precios y disponibilidad de fechas.
- **Riesgo Operativo Financiero:** Desconocimiento por parte de los clientes de los términos y condiciones de cuidado de la vestimenta y carencia de un sistema de cobros de garantía automatizados ante daños o atrasos.
- **Falta de Trazabilidad:** Dificultad del administrador para dar seguimiento al estado del ciclo de vida de los alquileres (Pendiente, Reservado, Entregado, Devuelto, Con Daños, Atrasado).

---

## 3. Objetivos Estratégicos
- **Liderazgo Digital:** Convertirse en la plataforma e-commerce de referencia para el alquiler folclórico panameño premium.
- **Eficiencia del Negocio:** Automatizar la validación de disponibilidad cruzada por talla y fecha, garantizando cero sobreventas.
- **Protección de Activos:** Implementar la aceptación obligatoria de términos legales y un flujo automatizado de retención de depósito en garantía (Stripe Sandbox).
- **Control Total:** Proveer un panel administrativo para dar trazabilidad completa al ciclo operativo de reservas y devoluciones.

---

## 4. Alcance Funcional (Scope)

### 4.1. Plataforma de Clientes (B2C)
- **Catálogo Dinámico:** Visualización premium de productos folclóricos con filtros dinámicos por categorías, rango de fechas de disponibilidad y tallas.
- **Página de Producto:** Selección inteligente de tallas con desglose de stock y un calendario interactivo que inhabilita fechas reservadas y evalúa el corte logístico diario (corte a las 6:00 PM).
- **Proceso de Reserva (Checkout):**
  - **Validación de Disponibilidad:** Doble chequeo en backend para impedir solapamiento de fechas.
  - **Aceptación de Términos Obligatoria:** Aceptación explícita mediante checkbox antes de pagar, registrando metadatos legales (IP, User Agent, Timestamp).
  - **Modalidades de Pago:** Opción de pagar el **Abono de Reserva (25%)** o el **Pago Completo (100%)** con Stripe.
- **Confirmación Dinámica:** Recibo detallado tras pago exitoso con resumen de costos e indicaciones del proceso de recogida.
- **Perfil de Usuario:** Historial de alquileres, estado actual de reservas e incidencias asociadas.

### 4.2. Panel del Administrador
- **Dashboard Operativo:** Indicadores de ingresos, reservas activas, próximas devoluciones y alertas de mora.
- **Gestión de Inventario:** Creación de productos con variantes de talla, stock específico, precio base/price overrides por talla e inhabilitación por mantenimiento.
- **Control de Reservas:** Trazabilidad completa de estados (pending, reserved, paid, confirmed, delivered, returned, late, damaged, cancelled).
- **Reglas de Negocio:** Panel para ajustar parámetros del negocio (porcentajes de reserva, montos de mora por día, categorías y tallas).

---

## 5. Stack Tecnológico Confirmado
El sistema se ha implementado utilizando los siguientes componentes arquitectónicos y tecnológicos:
- **Frontend (Client):** React 19 + Vite 6 + TypeScript + Tailwind CSS v4 para interfaces premium de lujo silencioso.
- **Backend (API Server):** Bun runtime + Hono web framework + TypeScript.
- **Base de Datos (Persistence):** MongoDB (Mongoose ODM) para modelar variantes anidadas e índices compuestos de disponibilidad.
- **Autenticación (Security):** Clerk para control de acceso, roles (client/admin) e identidades delegadas.
- **Pasarela de Pagos (Financial):** Stripe Checkout (Simulado en modo Sandbox/Demo local).
- **Containerización (DevOps):** Orquestación local a través de Docker y Docker Compose.
- **Testing (QA):** Suite Playwright E2E para flujos críticos (Auth, Negativo de Términos, Compra, Admin).
