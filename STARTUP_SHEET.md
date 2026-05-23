# Guía de Arranque Rápido (STARTUP_SHEET.md)

Esta guía detalla los pasos para levantar el entorno de desarrollo de **Tembleques Camila** y ejecutar el flujo de prueba mínimo.

---

## 1. Prerrequisitos
Antes de iniciar, asegúrese de contar con:
- **Bun:** (v1.x o superior) como runtime de JavaScript y gestor de dependencias principal.
- **Docker y Docker Compose:** Para la orquestación y contenedorización de servicios.
- **Node.js/npm:** Opcional (se prefiere Bun para todas las tareas).

---

## 2. Variables de Entorno
1. Copie el archivo `.env.example` en la raíz como `.env`:
   ```bash
   cp .env.example .env
   ```
2. El archivo `.env` por defecto viene preconfigurado con claves de prueba seguras para Clerk y Stripe en modo demo/sandbox. Asegúrese de que `STRIPE_SECRET_KEY` tenga el valor `sk_test_placeholder` para activar la simulación de pagos integrada y no requerir credenciales reales.

---

## 3. Comandos de Arranque

### Opción A: Ecosistema Completo con Docker (Recomendado)
Levanta de forma automatizada MongoDB, el Servidor Hono Backend y el Cliente React Frontend en una red interna aislada.
```bash
# Levantar el entorno en segundo plano
docker-compose up --build -d

# Ver logs del backend
docker-compose logs -f backend
```
*El frontend estará disponible en `http://localhost:5173` y el backend en `http://localhost:3000`.*

### Opción B: Ejecución Local de Desarrollo (Independiente)
Requiere una instancia de MongoDB activa en local (ej. corriendo en Docker o MongoDB Atlas).
```bash
# Terminal 1: Iniciar el backend
cd backend
bun install
bun run dev

# Terminal 2: Iniciar el frontend
cd frontend
bun install
bun run dev
```

### Seeding de Datos
Si la base de datos se inicia vacía, se recomienda poblar el inventario inicial con productos típicos santeños:
```bash
cd backend
bun run seed
```

---

## 4. Ejecución de Pruebas E2E (Playwright)

Para validar automáticamente todos los flujos críticos (autenticación, catálogo, checkout negativo/positivo de términos y administración):

1. Instale Playwright en la raíz del proyecto:
   ```bash
   bun install
   bunx playwright install chromium
   ```
2. Asegúrese de que los servidores frontend y backend estén corriendo (puertos 5173 y 3000 respectivamente).
3. Ejecute la suite de pruebas:
   ```bash
   # Correr pruebas en segundo plano (headless)
   bun run test:e2e
   
   # Abrir la interfaz de usuario interactiva de Playwright
   bunx playwright test --ui
   ```

---

## 5. Flujo de Prueba Mínimo Manual (Bypass de Clerk)

Debido a que Clerk requiere autenticación OTP/social real, se ha implementado un mecanismo de bypass para pruebas:

1. Ingrese a la web en `http://localhost:5173`.
2. Abra la consola de herramientas de desarrollador del navegador (F12) y ejecute:
   ```javascript
   // Para autenticarse como Cliente regular
   localStorage.setItem('mock_auth_token', 'mock-client-token');
   
   // O para autenticarse como Administrador
   localStorage.setItem('mock_auth_token', 'mock-admin-token');
   ```
3. Refresque la pantalla. Observará que la sesión de Clerk se ha saltado de manera segura y podrá:
   - Acceder al perfil en `/profile` (si cargó como cliente).
   - Acceder al panel de administración en `/admin` (si cargó como admin).
4. Para cerrar sesión y limpiar el bypass, ejecute `localStorage.clear()` en consola o pulse el botón de "Cerrar Sesión" en la interfaz.
