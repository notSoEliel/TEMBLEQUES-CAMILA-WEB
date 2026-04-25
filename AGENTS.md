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
- **Componentes**: Radix UI (Headless) + Diseño Neobrutalista propio.
- **Servicios**: Clerk (Auth) + Stripe (Pagos) + Svix (Webhooks).

---

## 2. Reglas Estrictas de Desarrollo [RULES]

### [RULE] Gestión de Reglas (META-RULE)
> [!IMPORTANT]
> **Cada vez que se solicite añadir una nueva regla al proyecto:**
> 1. Crear un nuevo archivo `.md` descriptivo en la carpeta `.agents/rules/` (ej. `17-nueva-regla.md`).
> 2. Actualizar este archivo (`GEMINI.md`) y `AGENTS.md` para incluir la nueva regla en la sección correspondiente. **Nunca omitir este paso.**

### [RULE] Exclusividad de TypeScript
- Uso obligatorio de TypeScript en modo estricto.
- **Prohibido el uso de `any`**.
- Definir interfaces o tipos para todas las props, estados y respuestas de API.

### [RULE] Runtime y Comandos (Bun)
- Utilizar **Bun** como runtime principal.
- Comandos: `bun run [script]`, `bun install`, `bun test`.
- No usar `npm` o `yarn` a menos que sea estrictamente necesario.

### [RULE] Estética y UI Neobrutalista
- **Bordes**: Siempre `border-2 border-black` en contenedores principales.
- **Sombras**: Siempre `shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` (sólidas, sin difuminado).
- **No Placeholders**: Prohibido usar imágenes rotas o placeholders genéricos. Usar iconos de Lucide o colores de marca.
- **Mobile First**: Priorizar la experiencia en dispositivos móviles.

### [RULE] Idioma y Ortografía
- **Español Perfecto**: UI, errores y mensajes deben estar en español con ortografía y acentuación impecable.
- **Cero Spanglish**: Mantener consistencia total en el idioma de la interfaz.

### [RULE] Comunicación y Código
- **Emojis**: Prohibido el uso de emojis en mensajes de commit, comentarios de código o logs de consola, a menos que sea para diferenciar estados visuales en la UI.
- **Documentación**: Usar Mermaid para representar flujos complejos en archivos `.md`.

### [RULE] Manejo de Errores (Backend)
- **AppError**: Lanzar siempre `AppError` con mensaje, status code y código de error único.
- **No Try-Catch Genérico**: Dejar que el handler global de Hono gestione los errores a menos que se requiera lógica de recuperación específica.
- **Seguridad**: Nunca exponer errores internos de MongoDB o stack traces al cliente.

### [RULE] Manejo de Errores (Frontend)
- **Visualización**: 
  - Errores de ruta -> `<ErrorPage />`.
  - Errores de API -> `useErrorModal`.
  - Prohibido `window.alert()`.
- **Formularios**: Errores inline permitidos para validación en tiempo real.

### [RULE] Paginación y Listados
- **Backend**: Parámetros `page` y `limit` obligatorios en queries. Respuesta debe incluir objeto `pagination`.
- **Frontend**: Sincronización obligatoria con `URLSearchParams`.
- **Catalog Grid**: Límites recomendados: 4, 8, 12, 20 para encajar en cuadrícula.

### [RULE] Lógica de Reserva (Checkout)
- **Validación de Fechas**: Impedir superposición de fechas. Validar disponibilidad real en el backend antes de proceder a Stripe.
- **Términos**: Checkbox obligatorio. El backend debe validar que `termsAccepted` es true.
- **Registro de Aceptación**: Guardar IP, User Agent y Timestamp al aceptar términos.

### [RULE] Pagos y Webhooks
- **Stripe**: El cambio de estado a `paid` solo ocurre mediante confirmación de webhook.
- **Seguridad**: Validar la firma del webhook usando Svix o la SDK oficial de Stripe.

### [RULE] Testing y Calidad
- **Unitarios**: Vitest para lógica de negocio (cerca del archivo fuente).
- **E2E**: Playwright para flujos críticos (Reserva, Login, Admin).
- **Clean Code**: Seguir principios DRY y SOLID.

---

## 3. Arquitectura y Estructura

### Organización del Repositorio
- `frontend/`: UI, B2C y Dashboard Admin.
- `backend/`: API, modelos (Mongoose), controladores y servicios.
- `docs/`: Documentación del sistema.

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
4. **Skills**: Consulta `.agents/skills/` para Stripe, E2E o Docker.
