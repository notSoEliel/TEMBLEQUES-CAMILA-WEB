# [RULE] Documentación Modular (18)

## Contexto
Para asegurar que el proyecto sea escalable y que la transferencia de conocimiento a nuevos desarrolladores (humanos o agentes de IA) sea eficiente, el sistema documental se organiza de forma modular y jerárquica.

## Mandatos Estrictos

### 1. Ubicación y Estructura
- Toda la documentación técnica profunda debe almacenarse en la carpeta `/docs` utilizando archivos Markdown (`.md`) especializados.
- El archivo `README.md` en la raíz del proyecto tiene la función exclusiva de ser un **Portal Maestro de Navegación**.
- El `README.md` debe contener un diagrama Mermaid que ilustre el ecosistema documental completo.

### 2. Formato y Estilo
- **Cero Emojis**: Queda estrictamente prohibido el uso de emojis en cualquier archivo dentro de `docs/` o en el `README.md` principal (Regla 03).
- **Idioma**: La documentación debe redactarse en un español técnico impecable.
- **Visualización**: Se debe priorizar el uso de diagramas Mermaid (`graph`, `sequenceDiagram`, `stateDiagram`) para explicar flujos complejos.

### 3. Actualización y Mantenimiento
- Al implementar una nueva funcionalidad crítica (ej. un nuevo servicio de pago o un cambio en el motor de disponibilidad), es obligatorio actualizar el módulo correspondiente en `docs/`.
- No se deben dejar bloques de código obsoletos en la documentación; estos deben reflejar siempre la implementación actual en `master`.

### 4. Resúmenes Brief
- Cada sección de documentación en el `README.md` debe incluir un bloque "Brief" que proporcione un resumen ejecutivo de una o dos líneas sobre el valor técnico del documento vinculado.
