# Reglas de Arquitectura - Tembleques Camila

1. **Stack Tecnológico**:
   - Frontend: React + Vite + TypeScript.
   - UI: TailwindCSS + shadcn/ui.
   - Backend: Bun + Hono + TypeScript.
   - Base de Datos: MongoDB (Mongoose).
   - Autenticación: Clerk (OTP + Google).
   - Pagos: Stripe.

2. **Estructura del Repositorio**:
   - El proyecto es un monorepo administrado con Bun.
   - Carpeta `frontend/`: Contiene la lógica de la UI y presentación (B2C + Dashboard Admin).
   - Carpeta `backend/`: Contiene las APIs, webhooks, modelos y lógica de negocio.

3. **Arquitectura del Backend**:
   - Se debe organizar modularmente (por ejemplo, en `routes/`, `models/`, `controllers/`, `services/`).
   - Usar Hono para gestionar las rutas de manera ligera y rápida con Bun.

4. **Reglas Generales**:
   - Mantener el código estrictamente tipado con TypeScript.
   - Evitar lógicas pesadas en los componentes React; mover el estado complejo a hooks y la lógica de negocio al backend.
   - Todo código nuevo debe contemplar la estética premium exigida en el PRD.
