# Environment Setup Step Documenter (Documentador de Configuración del Entorno)

Este skill permite a Claude generar guías de configuración de entorno exhaustivas, determinísticas y "a prueba de errores" para el proyecto Tembleques Camila. Su objetivo es que cualquier desarrollador, sin importar su nivel de experiencia, pueda pasar de "cero" a "entorno funcional" en menos de 15 minutos, configurando correctamente todos los servicios locales y externos.

---

## Cuándo usar este skill

DEBES usar este skill cuando:
- Un nuevo colaborador se una al proyecto y necesite instrucciones claras (Onboarding).
- Se realicen cambios significativos en el stack (ej. añadir una base de datos nueva o un servicio de colas).
- El usuario encuentre errores al intentar ejecutar el proyecto localmente.
- Se necesite documentar cómo configurar las herramientas de terceros (Clerk, Stripe, MongoDB Atlas).
- Se requiera una guía para configurar el entorno de pruebas (Vitest/Playwright).
- El usuario pida ayuda con la configuración de Docker o las variables de entorno.

---

## Objetivos de la documentación

La documentación generada debe:
1. **Ser Secuencial y Lógica**: Los pasos deben seguir un orden que minimice los retrocesos.
2. **Cubrir Servicios Externos con Detalle**: No asumir que el desarrollador sabe configurar Stripe o Clerk.
3. **Incluir Comandos Listos para Copiar**: Minimizar la fricción mediante el uso de bloques de código claros.
4. **Visualizar el Proceso de Setup**: Usar Mermaid para mostrar el camino crítico de la configuración.
5. **Prevenir Errores Comunes**: Incluir una sección de Troubleshooting basada en experiencias previas.
6. **Respetar las Reglas del Proyecto**: Enfatizar el uso de Bun (Regla 02) y la seguridad de los secretos.

---

## Estructura de la Respuesta Requerida

# [Título: Guía Definitiva de Configuración de Entorno - Tembleques Camila]

## 1. Requisitos Previos de Software
Lista detallada con versiones mínimas recomendadas:
- **Bun**: El runtime y gestor de paquetes principal.
- **Docker & Docker Compose**: Para la base de datos local.
- **Git**: Para el control de versiones.
- **Stripe CLI**: Crucial para probar webhooks localmente.

## 2. Diagrama de Flujo de Instalación (Mermaid)
Un diagrama `graph TD` que muestre los pasos desde el clonado hasta el primer `dev`.

## 3. Configuración Paso a Paso

### Paso 1: Obtención del Código y Dependencias
- Comandos de `git clone`.
- Ejecución de `bun install` y explicación de por qué no usar npm.

### Paso 2: El Corazón del Sistema - Variables de Entorno
- Instrucciones para copiar `.env.example` a `.env`.
- Tabla exhaustiva explicando cada variable:
  - `DATABASE_URL`: Formato y conexión.
  - `CLERK_*`: Dónde obtener las API Keys de Clerk.
  - `STRIPE_*`: Configuración de llaves de prueba.
  - `SVIX_SECRET`: Para la validación local de webhooks.

### Paso 3: Infraestructura Local con Docker
- Cómo levantar MongoDB usando `docker-compose up -d`.
- Verificación de que el contenedor está saludable.

### Paso 4: Configuración de Servicios Cloud (Modo Desarrollo)
- **Clerk**: Cómo crear un proyecto de desarrollo y configurar los dominios permitidos (`localhost:3000`).
- **Stripe**: Pasos para activar el modo de prueba, crear un producto de ejemplo y obtener el `STRIPE_WEBHOOK_SECRET`.

### Paso 5: El Puente de Comunicación (Stripe CLI)
- Cómo redirigir eventos de Stripe a nuestro backend local: `stripe listen --forward-to localhost:3000/api/webhooks`.

## 4. Verificación y Primer Inicio
- Ejecución de `bun run dev`.
- Cómo saber que todo funciona (URLs de salud, logs esperados).
- Ejecución de los tests iniciales: `bun test`.

## 5. Troubleshooting (Solución de Problemas)
Tabla de errores frecuentes y sus soluciones rápidas.

---

## Instrucciones Detalladas para el Generador (Claude)

### Visualización del Setup con Mermaid
```mermaid
graph TD
    Start((Inicio)) --> Clone[Clonar Repo]
    Clone --> Install[bun install]
    Install --> Env[Configurar .env]
    Env --> Docker[Docker Compose Up]
    Docker --> External[Configurar Clerk/Stripe]
    External --> Webhooks[Stripe CLI Listen]
    Webhooks --> Run[bun run dev]
    Run --> Success{¿Funciona?}
    Success -- Sí --> End((¡Listo!))
    Success -- No --> Debug[Revisar Troubleshooting]
    Debug --> Env
```

### Profundidad del Contenido (Detalle de +400 líneas)

Al explicar **Bun** (Regla 02):
"En Tembleques Camila, Bun no es opcional. Es el motor que permite que nuestros tests corran en milisegundos y que las dependencias se instalen de forma instantánea. Si intentas usar `npm install`, podrías generar un archivo `package-lock.json` innecesario y causar conflictos en el CI. Siempre usa `bun install` para mantener la integridad de `bun.lockb`."

Al explicar la **Configuración de Stripe**:
"Para que el flujo de reserva funcione (Regla 06), el backend debe recibir confirmación de Stripe. Localmente, esto se logra mediante el Stripe CLI. Una vez autenticado con `stripe login`, debes mantener una terminal abierta con el comando de redirección. Sin este paso, las reservas en tu entorno local se quedarán eternamente en estado 'pendiente', ya que el webhook de confirmación nunca llegará a tu servidor local."

---

## Ejemplos y Contraejemplos de Instrucciones

### ✅ Ejemplo Correcto (Detallado)
"Copia el archivo de ejemplo: `cp .env.example .env`. Abre el archivo y busca la línea `DATABASE_URL`. Si estás usando el Docker proporcionado, el valor debería ser `mongodb://admin:password@localhost:27017/tembleques?authSource=admin`. No cambies el puerto a menos que tengas otra instancia de MongoDB corriendo."

### ❌ Ejemplo Incorrecto (Vago)
"Crea un .env y pon tus llaves de API. Luego dale a run y debería funcionar si tienes todo instalado." [No explica qué llaves, no da el comando de copia, no menciona Docker].

---

## Glosario de Comandos Útiles
- `bun run dev`: Inicia el entorno de desarrollo con hot-reload.
- `bun run test`: Ejecuta la suite de pruebas unitarias.
- `docker-compose logs -f`: Para ver qué está pasando dentro de la base de datos.
- `stripe trigger payment_intent.succeeded`: Para simular un pago exitoso sin pasar por la UI.

---

## Lista de Verificación Final del Setup
- [ ] ¿He clonado la rama correcta?
- [ ] ¿He instalado las dependencias con Bun?
- [ ] ¿Mi archivo `.env` tiene valores válidos para Clerk y Stripe?
- [ ] ¿El contenedor de Docker está en estado 'running'?
- [ ] ¿He verificado la conexión con `bun test`?
- [ ] ¿Tengo el Stripe CLI configurado para recibir webhooks?

---

### Detalles Adicionales para la Expansión
Para asegurar la extensión de +400 líneas, Claude debe incluir:
- **Configuración del IDE**: Recomendaciones para VS Code (extensiones de ESLint, Tailwind, Prettier).
- **Manejo de Seed Data**: Cómo poblar la base de datos con productos iniciales de tembleques para no empezar con un catálogo vacío.
- **Configuración de Clerk JWT**: Cómo configurar el middleware para que reconozca los tokens en desarrollo.
- **Permisos de Archivos**: Solución de problemas comunes de permisos en sistemas Linux/Mac.
