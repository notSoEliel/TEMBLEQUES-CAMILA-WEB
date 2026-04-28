# Tembleques Camila - Project Context for AI Agents (GEMINI.md)

Este archivo sirve como el documento de contexto principal (System Prompt/Project Context) para cualquier agente de IA. Este documento define la identidad, arquitectura y reglas estrictas del proyecto.

---

## 1. Contexto del Proyecto

### Identidad
**Tembleques Camila** es una plataforma e-commerce B2C premium para el alquiler de vestimenta folclórica panameña. El objetivo es digitalizar un proceso tradicional con una experiencia de usuario moderna y fluida.

### Stack Tecnológico Principal
- **Frontend**: React 19 + Vite + TypeScript + React Router v7.
- **Backend**: Bun + Hono + TypeScript + MongoDB (Mongoose).
- **Estilos**: Tailwind CSS v4 + Lucide React.
- **Componentes**: Radix UI (Headless) + Diseño Neobrutalista propio.
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

### [RULE] Estética y UI Neobrutalista Flat (12, 14)
- **Bordes**: Siempre `border-2 border-black` en contenedores principales.
- **Sombras**: **PROHIBIDO** el uso de sombras sólidas o relieves. El diseño debe ser plano (flat) con bordes definidos.
- **No Placeholders**: Prohibido usar imágenes rotas o placeholders genéricos. Usar iconos de Lucide o colores de marca.
- **Radios**: El radio por defecto (`--radius`) es de `2rem` (estilo pill-shaped).

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
2. **Reutiliza UI**: Revisa `components/ui` antes de crear nuevos estilos.
3. **Manejo de Errores**: Usa `AppError` en backend e interceptalo con modales en frontend.
4. **Skills**: Consulta `.agents/skills/` para Stripe, E2E, Docker o documentación (Architecture, Dependency Map, Setup, Design Decisions, Contributor Guide, Documentation Modularizer).
5. **Rules**: Consulta siempre `.agents/rules/` para detalles técnicos profundos de cada módulo.
