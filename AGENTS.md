# Tembleques Camila - Project Context for AI Agents (AGENTS.md)

Este archivo sirve como el documento de contexto principal (System Prompt/Project Context) para cualquier agente de IA (Gemini, Claude, etc.) que trabaje en el proyecto. Debes leer y entender este archivo para mantener la consistencia en el código, el diseño y la arquitectura.

## 1. Resumen del Proyecto
**Tembleques Camila** es una plataforma web B2C enfocada en el alquiler de vestimenta típica panameña (polleras, vestuario masculino, infantil) y accesorios folclóricos (tembleques, joyería). 
- **Objetivo**: Digitalizar el proceso de alquiler, reducir gestiones manuales y ofrecer una experiencia de usuario (UX) premium, intuitiva y moderna.
- **Flujo Principal**: Landing -> Catálogo (Filtros) -> Detalle de Producto -> Selección de Fechas -> Aceptación de Términos (Obligatorio) -> Pago con Stripe -> Confirmación.

## 2. Tech Stack

### Frontend (Directorio `/frontend`)
- **Core**: React 19, Vite, TypeScript.
- **Enrutamiento**: React Router v7.
- **Estilos**: Tailwind CSS v4, Lucide React (Iconos).
- **Componentes UI**: Radix UI (sin cabeza), diseño propio Neobrutalista (bordes marcados, alto contraste).
- **Autenticación**: Clerk (`@clerk/clerk-react`) totalmente localizado en español.
- **Gestión de Estado**: Principalmente estado local de React, contextos y hooks personalizados.

### Backend (Directorio `/backend`)
- **Core**: Bun (Runtime), Hono (Web Framework), TypeScript.
- **Base de Datos**: MongoDB (usando Mongoose).
- **Validación**: Zod.
- **Pagos**: Stripe API.
- **Autenticación/Webhooks**: Clerk Backend SDK y Svix (para verificar webhooks).
- **Ejecución Local**: `bun run dev`, `bun run start`, `bun run tunnel` (para exponer webhooks de Stripe/Clerk localmente).

### Infraestructura y Testing
- **Contenedores**: Docker Compose (Frontend, Backend, MongoDB).
- **Testing**: Playwright (E2E Testing), Bun test (Unit Testing).

## 3. Arquitectura de Base de Datos (MongoDB)
La base de datos se centra en las siguientes colecciones principales:
- **Users**: Información sincronizada desde Clerk mediante webhooks (`role`, `email`, etc.).
- **Products**: Inventario con control de stock, tallas, estado y calendario de disponibilidad (`availability_calendar`).
- **Rentals**: El núcleo del negocio. Rastrea fechas, totales, estados de reserva (`pending`, `paid`, `confirmed`, `delivered`, `returned`, etc.) y estado de pago.
- **TermsAcceptance**: Registro auditable de que el usuario aceptó los términos de responsabilidad por daños/retrasos (IP, User Agent, Timestamp) vinculado a un `rental_id`.

## 4. Reglas de Diseño y UI (CRÍTICO)
- **Estilo Visual**: El proyecto utiliza una estética Neobrutalista / Minimalista-Premium. Los bordes deben ser definidos (ej. `border-2 border-black`), sombras sólidas (`shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]` o equivalentes definidos en Tailwind).
- **No usar placeholders**: Usa iconos o colores de fondo elegantes en lugar de imágenes rotas.
- **Idioma**: Toda la interfaz de usuario, mensajes de error, notificaciones y correos deben estar estrictamente en **Español** con ortografía y acentuación perfectas.
- **UX**: Priorizar "Mobile First". El proceso de reserva debe ser extremadamente fluido y realizable en menos de 3 minutos.

## 5. Integraciones Críticas
- **Stripe**: Es obligatorio que el estado de la renta cambie de `pending` a `paid`/`confirmed` únicamente tras la confirmación del pago mediante webhooks de Stripe.
- **Clerk**: La gestión de usuarios y roles (admin vs cliente) está delegada a Clerk. El backend debe sincronizar a los usuarios escuchando los eventos vía webhook (con Svix).
- **Términos y Condiciones**: Es estrictamente obligatorio en la lógica de negocio y en la UI que un usuario no pueda proceder a pagar (checkout) sin haber marcado explícitamente la aceptación de términos.

## 6. Comandos Comunes
- Levantar todo (Docker): `docker-compose up --build`
- Backend Dev: `cd backend && bun run dev`
- Frontend Dev: `cd frontend && npm run dev`
- Local Tunnel (Webhooks): `cd backend && bun run tunnel`

## 7. Instrucciones para la IA (Tú)
1. **Analiza el contexto**: Siempre revisa en qué carpeta estás (`frontend` vs `backend`) antes de modificar código.
2. **Reutiliza UI**: Si necesitas un botón, input o modal en el frontend, revisa los componentes existentes basados en Radix UI. No reinventes estilos.
3. **Manejo de Errores**: Usa la clase `AppError` en el backend para retornar errores estructurados e interceptarlos adecuadamente en el frontend.
4. **Skills / Reglas Específicas**: Si la tarea involucra integraciones específicas (ej. E2E, Docker, Stripe), revisa la carpeta `.agents/skills/` para leer las instrucciones profundas de esa área.
