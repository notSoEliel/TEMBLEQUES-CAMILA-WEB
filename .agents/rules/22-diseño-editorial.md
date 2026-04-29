# Sistema de Diseño Editorial y Paleta Suave (22-diseño-editorial.md)

Este documento define la evolución visual de **Tembleques Camila**, pasando de una estética saturada a un diseño editorial de alta costura, minimalista y legible.

---

## 1. Filosofía Visual: "Lujo Silencioso"
El diseño debe transmitir exclusividad y calma. Se prioriza el espacio en blanco (whitespace) y la jerarquía tipográfica sobre los elementos decorativos pesados.

### [RULE] Eliminación de Degradados Saturados
- **Prohibición**: Queda prohibido el uso de `bg-brand-gradient` o `text-brand-gradient` en elementos de texto grandes, fondos de tarjetas principales o botones de acción estándar.
- **Alternativa**: Utilizar el color **Primary** en estado sólido, acentos con opacidad (ej. `bg-primary/5`) o subrayados decorativos (`underline decoration-primary/20`) para dar énfasis sin saturar.
- **Uso Excepcional**: Los degradados quedan reservados únicamente para micro-detalles de interactividad o estados hover muy específicos, previa aprobación.

## 2. Jerarquía Tipográfica Editorial
Se establece un sistema dual para diferenciar la narrativa de marca de la información técnica.

- **Títulos y Narrativa**: Uso obligatorio de tipografía **Serif** (`font-display`). Para énfasis elegante, utilizar el estilo **Italic** (ej. "Artesano *Elite*").
- **Datos y UI**: Uso de tipografía **Sans** para etiquetas, botones, precios y datos técnicos, asegurando máxima legibilidad.
- **Prevención de Recortes**: Todo título en `font-display` debe tener un interlineado generoso (`leading-relaxed` o `leading-tight` con `py-2`) para evitar que los trazos de las letras se corten visualmente.

## 3. Componentes y Geometría
- **Radios Pill-Shaped**: Se mantiene el estándar de `--radius: 2rem` para todos los contenedores principales, inputs y botones.
- **Sombras de Profundidad**: Sustituir bordes sólidos por la utilidad `shadow-elegant` para crear una sensación de capas flotantes y ligeras.
- **Paginación**: Los listados de más de 8 elementos deben implementar paginación visible, manteniendo los controles presentes incluso en la primera página para consistencia de UI.

## 4. Mapas e Interactividad
- **Anti-Hijacking**: En mapas interactivos (Leaflet), desactivar obligatoriamente el zoom con rueda (`scrollWheelZoom: false`) y el arrastre (`dragging: false`) para no interferir con el scroll natural de la página, especialmente en móviles.
- **Acciones Externas**: Proveer siempre un botón de "Cómo llegar" que redirija a servicios de mapas externos (Google Maps/Apple Maps).
