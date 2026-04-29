# Tembleques Camila - Project Context for AI Agents (AGENTS.md)

Este archivo sirve como el documento de contexto principal (System Prompt/Project Context) para cualquier agente de IA. Este documento define la identidad, arquitectura y reglas estrictas del proyecto.

---

## 1. Contexto del Proyecto

### Identidad
**Tembleques Camila** es una plataforma e-commerce B2C premium para el alquiler de vestimenta folclórica panameña. El objetivo es digitalizar un proceso tradicional con una experiencia de usuario moderna y fluida.

### Stack Tecnológico Principal
- **Frontend**: React 19 + Vite + TypeScript + React Router v7.
- **Backend**: Bun + Hono + TypeScript + MongoDB (Mongoose).
- **Estilos**: Tailwind CSS v4 + Lucide React.
- **Componentes**: Radix UI (Headless).
- **Servicios**: Clerk (Auth) + Stripe (Pagos) + Svix (Webhooks).

---

## 2. Reglas Estrictas de Desarrollo [RULES]

### [RULE] Gestión de Reglas (META-RULE)
> [!IMPORTANT]
> **Cada vez que se solicite añadir una nueva regla al proyecto:**
> 1. Crear un nuevo archivo `.md` descriptivo en la carpeta `.agents/rules/` (ej. `18-nueva-regla.md`).
> 2. Actualizar este archivo (`AGENTS.md`) y `GEMINI.md` para incluir la nueva regla en la sección correspondiente. **Nunca omitir este paso.**

### [RULE] Exclusividad de TypeScript (01)
- Uso obligatorio de TypeScript en modo estricto.
- **Prohibido el uso de `any`**. Definir interfaces o tipos para todas las props, estados y respuestas de API.

### [RULE] Runtime y Comandos Bun (02)
- Utilizar **Bun** como runtime principal. Comandos: `bun run [script]`, `bun install`, `bun test`.
- No usar `npm` o `yarn` a menos que sea estrictamente necesario.

### [RULE] Comunicación y Código (03)
- **Emojis**: Prohibido el uso de emojis en mensajes de commit, comentarios de código o logs de consola, a menos que sea para diferenciar estados visuales en la UI.
- **Idioma**: Español impecable en UI, errores y mensajes. Cero Spanglish.

### [RULE] Estética y Diseño Premium (12, 14, 20)
- **Evolución Visual**: Queda formalmente prohibido el estilo Neobrutalista. No se permiten bordes negros gruesos ni diseños "crudos". La nueva identidad es **Premium, Elegante y Limpia**.
- **Geometría de Radios**: El radio por defecto (`--radius`) es de **2rem**. Esto crea un aspecto "pill-shaped" obligatorio en todos los botones, tarjetas e inputs.
- **Sistema de Color OKLCH**: Uso exclusivo de `oklch()` en el CSS. Prohibido el uso de HEX/RGB/HSL en cualquier parte del código frontend.
- **Profundidad y Sombras**: Uso mandatorio de la utilidad `shadow-elegant` para sustituir la definición de bordes. Los elementos flotantes deben usar `shadow-elegant-lg`.
- **Componentes**: Prohibida la creación de UI manual. Todo componente debe ser una instancia de `shadcn/ui` y `Radix UI`.
- **Animaciones e Interacción**: 
    - Toda transición debe durar entre **200ms y 400ms**.
    - Uso obligatorio de animaciones de entrada/salida para componentes interactivos (Acordeones, Popovers).
    - Los estados hover deben ser sutiles (ej. elevación de 2px o cambio suave de opacidad).

### [RULE] Localización y Moneda (21)
- **Moneda Nacional**: Uso inquebrantable del **Balboa (PAB)**. El símbolo es `$`. Prohibido mostrar "USD".
- **Formateo**: Uso obligatorio de la utilidad `formatCurrency(amount)` ubicada en `@/lib/utils`. Nunca formatear montos manualmente.
- **Región**: Configuración regional `es-PA` para fechas, números y moneda. El idioma es español impecable (cero Spanglish).

### [RULE] Accesibilidad Móvil y Hover (17)
- **No dependencia de Hover**: Prohibido ocultar acciones críticas detrás de un estado hover. En móviles, todo debe ser visible o accesible vía tap.
- **Mobile First**: Priorizar la experiencia en dispositivos móviles antes que en desktop.

### [RULE] Manejo de Errores (Backend) (15)
- **AppError**: Lanzar siempre `AppError` (de `lib/errors.js`) con mensaje, status code y código de error único.
- **No Try-Catch Genérico**: Dejar que el handler global de Hono gestione los errores a menos que se requiera lógica de recuperación específica.
- **Seguridad**: Nunca exponer errores internos de MongoDB o stack traces al cliente.

### [RULE] Manejo de Errores (Frontend) (15)
- **Visualización**: Errores de ruta -> `<ErrorPage />`. Errores de API -> `useErrorModal`.
- **Prohibido window.alert()**: Usar modales o errores inline para validación en tiempo real.

### [RULE] Paginación y Listados (16)
- **Backend**: Parámetros `page` y `limit` obligatorios en queries. Respuesta debe incluir objeto `pagination`.
- **Frontend**: Sincronización obligatoria con `URLSearchParams`. 
- **UX**: Scroll suave al inicio al cambiar de página.

### [RULE] Lógica de Reserva y Checkout (07, 08)
- **Validación de Fechas**: Impedir superposición de fechas y validar disponibilidad en el backend antes de proceder a Stripe.
- **Términos**: Checkbox obligatorio. El backend debe registrar IP, User Agent y Timestamp al aceptar términos.

### [RULE] Pagos y Stripe (06)
- **Confirmación**: El cambio de estado a `paid` solo ocurre mediante confirmación de webhook de Stripe.
- **Seguridad**: Validar siempre la firma del webhook.

### [RULE] Testing y Calidad (10)
- **Unitarios**: Vitest para lógica de negocio.
- **E2E**: Playwright para flujos críticos (Reserva, Login, Admin).
- **Clean Code**: Seguir principios DRY y SOLID.

### [RULE] Documentación Modular (18)
- Toda la documentación técnica debe residir en la carpeta `docs/`.
- El `README.md` principal debe actuar únicamente como un portal de navegación hipervinculado.
- Queda prohibido el uso de emojis en los documentos técnicos de la carpeta `docs/`.

### [RULE] Verificación de Tipos (19)
- **Mandatorio**: Ejecutar `cd frontend && bun x tsc --noEmit` después de cada cambio en `.ts` o `.tsx`.
- **Bloqueo**: Prohibido presentar código o dar por terminada una tarea si existen errores de tipos.

---

## 3. Arquitectura y Estructura (04, 05, 09, 11)

### Organización del Repositorio
- `frontend/`: UI, B2C y Dashboard Admin.
- `backend/`: API, modelos (Mongoose), controladores y servicios.
- `docs/`: Documentación del sistema.
- `.agents/rules/`: Repositorio detallado de todas las reglas técnicas.

### Referencia de Códigos de Error Comunes
| Código | HTTP | Situación |
|---|---|---|
| `AUTH_TOKEN_REQUIRED` | 401 | Falta token de autenticación |
| `PRODUCT_DATES_UNAVAILABLE` | 409 | Fechas seleccionadas ya ocupadas |
| `RENTAL_TERMS_NOT_ACCEPTED` | 400 | No se marcaron los términos |
| `VALIDATION_ERROR` | 400 | Fallo en esquema Zod |

---

## 4. Instrucciones para la IA (Operativa)

1. **Check Folder**: Verifica si estás en `/frontend` o `/backend`.
2. **Type Check [CRITICAL]**: Si modificaste el frontend, ejecuta `cd frontend && bun x tsc --noEmit`. No respondas hasta que no haya errores.
3. **Reutiliza UI**: Revisa `components/ui` (shadcn) antes de crear nuevos estilos. Prohibida la UI manual.
4. **Manejo de Errores**: Usa `AppError` en backend e interceptalo con modales en frontend.
5. **Skills**: Consulta `.agents/skills/` para Stripe, E2E, Docker o documentación técnica.
6. **Rules**: Consulta siempre `.agents/rules/` para detalles técnicos profundos.
