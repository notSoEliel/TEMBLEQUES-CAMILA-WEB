# Reglas de Documentación Integral - Tembleques Camila

El proyecto debe contar con documentación completa, clara y mantenible para usuarios técnicos y no técnicos, ubicada en la carpeta `docs/`.

## 1. Tipos de Documentación Requerida
- **Funcional**: Alcance, reglas de negocio, historias de usuario, flujos principales (cliente/admin), políticas de alquiler.
- **Técnica**: Arquitectura general, modelo de datos (MongoDB), endpoints de API, variables de entorno, guía de Docker.
- **Calidad**: Estrategias de testing (Unitario y E2E), ejecución de pruebas, matriz de cobertura.

## 2. Diagramas
- Obligatorio el uso de **Mermaid** para representar flujos complejos, esquemas de bases de datos y arquitectura del sistema.

## 3. Entregables Clave
- `README.md` principal en la raíz siempre actualizado.
- Guía rápida de instalación y ejecución.
- Registro de Decisiones Técnicas (ADR) ligero.
- Evidencias visuales de pruebas E2E.
- Archivos modulares (ej. `architecture.md`, `database.md`) dentro de `docs/`.

## 4. Mantenimiento
- Al modificar una funcionalidad, base de datos o arquitectura, su respectiva documentación debe actualizarse en el mismo PR o commit.
