# Key Design Decision Explainer (Explicador de Decisiones Clave de Diseño)

Este skill permite a Claude justificar, racionalizar y documentar las decisiones arquitectónicas, tecnológicas y estéticas fundamentales del proyecto Tembleques Camila. Su propósito es actuar como la "memoria institucional" del desarrollo, asegurando que cada elección tenga un fundamento sólido y sea respetada por futuros colaboradores.

---

## Cuándo usar este skill

DEBES usar este skill cuando:
- El usuario pregunte "¿Por qué elegimos esta tecnología y no otra?".
- Se propongan cambios que contradigan las reglas de diseño (ej. añadir sombras sutiles o usar librerías de UI pesadas).
- Se necesite redactar un "Architecture Decision Record" (ADR) para una funcionalidad nueva.
- Se deba explicar la relación entre la estética Neobrutalista y la funcionalidad de la plataforma.
- El usuario cuestione el uso de herramientas específicas como Bun, Hono o Radix UI.
- Se requiera justificar la estructura de la base de datos o el flujo de autenticación por motivos de seguridad o escalabilidad.

---

## Objetivos de la documentación

La documentación generada debe:
1. **Contextualizar la Decisión**: Explicar qué problema se intentaba resolver en el momento de la elección.
2. **Presentar Alternativas Consideradas**: Demostrar que se evaluaron otras opciones (Análisis Comparativo).
3. **Justificar con Datos**: Usar argumentos de rendimiento, mantenibilidad, costo o experiencia de usuario (UX).
4. **Conectar con la Marca**: Explicar cómo la tecnología apoya la identidad de "Tembleques Camila".
5. **Visualizar el Razonamiento**: Usar diagramas Mermaid para mostrar los trade-offs (compensaciones).
6. **Referenciar las Reglas del Proyecto**: Citar explícitamente las reglas de `AGENTS.md` o `GEMINI.md`.

---

## Estructura de la Respuesta Requerida

# [Título: Registro de Decisión Arquitectónica (ADR) - [Tema]]

## 1. Contexto y Planteamiento del Problema
Descripción clara de la necesidad técnica o de negocio. ¿Qué nos llevó a buscar una solución en este área?

## 2. Decisión Tomada y Status
Qué opción se eligió y cuál es su estado actual (Propuesta, Aceptada, Reemplazada). Referencia a las reglas [RULES] pertinentes.

## 3. Justificación Técnica y de Diseño (Mermaid)
Un diagrama de decisión o una matriz de pros y contras.

## 4. Análisis de Alternativas (El "Por Qué No")
Explicación detallada de por qué se descartaron otras opciones populares (ej. por qué no usar Express, por qué no usar SQL puro, etc.).

## 5. Impacto y Consecuencias
- **Positivas**: Mejoras en velocidad, seguridad, facilidad de desarrollo.
- **Negativas/Trade-offs**: Curva de aprendizaje, dependencia de un servicio, limitaciones técnicas aceptadas.

## 6. Relación con la Estética Neobrutalista
Explicación de cómo esta decisión técnica facilita o refuerza el estilo visual plano, de alto contraste y centrado en la accesibilidad móvil.

---

## Instrucciones Detalladas para el Generador (Claude)

### Visualización de Trade-offs con Mermaid
```mermaid
quadrantChart
    title Análisis de Stack Tecnológico
    x-axis Baja Velocidad --> Alta Velocidad
    y-axis Compleja --> Simple
    quadrant-1 Mantener bajo observación
    quadrant-2 Elección Ideal: Bun + Hono
    quadrant-3 Evitar: Frameworks Pesados
    quadrant-4 Analizar para futuro
    "Express": [0.3, 0.4]
    "Bun + Hono": [0.9, 0.8]
    "Node.js Puro": [0.5, 0.5]
    "Fastify": [0.7, 0.3]
```

### Profundidad del Contenido (Detalle de +400 líneas)

Al explicar el **Neobrutalismo Flat** (Regla 14):
"La ausencia de sombras no es un capricho artístico. Es una decisión de ingeniería de diseño. Las sombras (box-shadow) consumen ciclos de renderizado en el navegador, especialmente en dispositivos móviles antiguos. Al eliminarlas, no solo ganamos una identidad visual rompedora que contrasta con la delicadeza de los tembleques, sino que aseguramos una tasa de frames constante (60fps) durante el scroll del catálogo, cumpliendo con nuestra prioridad 'Mobile First' (Regla 17)."

Al explicar **Bun + Hono**:
"Elegimos este combo para minimizar el 'Cold Start' y maximizar la densidad de peticiones por segundo. En un e-commerce donde la disponibilidad de productos cambia cada segundo, no podemos permitirnos una API que tarde 200ms solo en arrancar. Hono, al ser compatible con Service Workers, nos permite una flexibilidad de despliegue que Express simplemente no puede igualar sin capas adicionales de complejidad."

---

## Ejemplos y Contraejemplos de Justificación

### ✅ Ejemplo Correcto (Premium)
"Decidimos usar MongoDB (NoSQL) porque la vestimenta folclórica panameña es altamente heterogénea. Un 'Tembleque de Pavo Real' tiene atributos (cantidad de perlas, tipo de alambre) totalmente distintos a una 'Camisilla'. Un esquema rígido de SQL nos obligaría a realizar múltiples JOINs o tener tablas llenas de valores nulos. MongoDB nos da la flexibilidad de evolucionar el catálogo sin migraciones de base de datos dolorosas, manteniendo la integridad mediante Mongoose."

### ❌ Ejemplo Incorrecto (Vago)
"Usamos MongoDB porque es más fácil de usar que SQL y es lo que todos usan ahora para proyectos con Node." [Falta análisis de datos, falta contexto de negocio, falta mención a Mongoose].

---

## Glosario de Decisiones Estratégicas
- **Architecture over Agility**: Por qué a veces elegimos el camino más largo si es más robusto a largo plazo.
- **Headless First**: La decisión de separar la lógica de accesibilidad de la estética visual.
- **Strict Typing Policy**: El costo de escribir tipos frente al ahorro en depuración en producción.

---

## Lista de Verificación Final
- [ ] ¿He citado al menos dos reglas de `AGENTS.md`?
- [ ] ¿He incluido un diagrama (Mermaid) que ilustre la decisión?
- [ ] ¿He analizado al menos dos alternativas que fueron descartadas?
- [ ] ¿He explicado el impacto de la decisión en el rendimiento móvil?
- [ ] ¿La documentación es técnica, profunda y supera las 400 líneas de contenido real?
- [ ] ¿He conectado la decisión técnica con la visión de marca de Tembleques Camila?

---

### Detalles Adicionales para la Expansión
Para asegurar la extensión de +400 líneas, Claude debe profundizar en:
- **La Elección de TypeScript Estricto**: Por qué prohibir `any` es una decisión de seguridad económica.
- **Stripe vs. Pasarelas Locales**: Por qué priorizamos la robustez global y la API de Stripe para un negocio panameño.
- **Radix UI**: El compromiso innegociable con la accesibilidad para personas con discapacidad visual.
- **Vite como Bundler**: El abandono de Webpack en favor de la velocidad de desarrollo.
