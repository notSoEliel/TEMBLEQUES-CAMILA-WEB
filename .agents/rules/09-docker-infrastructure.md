# Reglas de Infraestructura (Docker) - Tembleques Camila

La solución debe ejecutarse en contenedores para asegurar consistencia entre desarrollo, pruebas y despliegue.

## Alcance Mínimo
- Contenedor para Frontend.
- Contenedor para Backend/API (Bun).
- Contenedor para MongoDB.
- Red interna aislada para comunicación entre servicios.
- Persistencia de datos mediante volúmenes para MongoDB.

## Criterios de Aceptación
- **Comando Único**: Se debe poder levantar todo el sistema con un solo comando (`docker compose up`).
- **Persistencia**: El reinicio de los servicios no debe causar pérdida de datos de la base de datos.
- **Health Checks**: Configurar health checks para la API y la base de datos en el `docker-compose.yml`.
- **Configuración**: Utilizar variables de entorno (`.env`) para configurar parámetros de los servicios.
- **Entornos**: Mantener configuraciones limpias y separadas para desarrollo local y testing.
