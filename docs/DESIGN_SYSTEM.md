# Design System - Tembleques Camila

Este documento establece la gobernanza técnica y estética obligatoria para el desarrollo del frontend de Tembleques Camila. Es una norma inquebrantable que debe ser seguida por cualquier desarrollador o agente de IA que trabaje en el proyecto.

## 1. Evolución Estética: El Fin del Neobrutalismo

Queda formalmente declarado el abandono del estilo Neobrutalista que caracterizó las fases iniciales del proyecto. La nueva identidad visual es **Premium, Elegante y Limpia**.

### Reglas de Aplicación Visual
- **Prohibición de Bordes Gruesos**: Queda estrictamente prohibido el uso de bordes negros sólidos superiores a 1px para contenedores principales o tarjetas.
- **Sombras Suaves**: Se autoriza y fomenta el uso de la utilidad `shadow-elegant` y `shadow-elegant-lg` para generar profundidad. No se deben usar sombras "hard" o desplazadas sin difuminado.
- **Minimalismo Estructural**: Los componentes deben respirar. El uso de espacios en blanco y paddings generosos es obligatorio para mantener la sensación premium.

## 2. Geometría y Sistema de Radio

La coherencia geométrica es el pilar de la interfaz. No se permiten desviaciones de los tokens establecidos.

- **Token de Radio Único**: El valor de `--radius` es de `2rem` (estilo pill-shaped).
- **Aplicación**: Todas las tarjetas, botones, inputs y contenedores de UI deben utilizar `rounded-[var(--radius)]` o su equivalente en clases de Tailwind (como `rounded-2xl` o `rounded-3xl` si coinciden exactamente con el token).
- **Excepciones**: Solo se permiten radios menores (ej. `rounded-xl`) para sub-componentes anidados (como imágenes dentro de una tarjeta) para mantener la armonía visual.

## 3. Paleta de Colores OKLCH

La gestión del color debe realizarse exclusivamente mediante el formato **OKLCH**. Este formato garantiza una percepción de luminosidad uniforme y una degradación de colores más natural.

### Tokens de Color Principales
- **Primary**: Representa la elegancia de la marca.
- **Secondary**: Colores de soporte para estados secundarios.
- **Accent**: Para micro-interacciones y llamadas a la acción críticas.

> [!IMPORTANT]
> Queda prohibido el uso de valores HEX, RGB o HSL directamente en el código JSX o archivos CSS. Todos los colores deben mapear a las variables definidas en `index.css` que utilizan la función `oklch()`.

## 4. Gobernanza de Componentes

### Prohibición de UI Manual
Se prohíbe la creación de elementos de interfaz base (botones, inputs, modales, acordeones, etc.) de forma manual utilizando HTML/CSS ad-hoc. 

- **Estandarización**: Todo nuevo componente debe instanciarse exclusivamente a través de las librerías oficiales del proyecto:
    1. **shadcn/ui**: Para componentes de alto nivel con estilos predefinidos.
    2. **Radix UI**: Para componentes headless que requieran lógica de accesibilidad compleja.
- **Personalización**: Cualquier modificación estética a los componentes de shadcn debe realizarse extendiendo el tema de Tailwind o mediante clases de utilidad que respeten el Design System.

## 5. Micro-animaciones e Interacción

La interfaz debe sentirse viva pero sutil. Las animaciones no deben distraer, sino guiar al usuario.

- **Herramientas**: Se permite el uso de `framer-motion` para transiciones complejas de página o estados de carga.
- **Estándar Radix**: Para componentes interactivos (Acordeones, Popovers, Modales), se deben usar las animaciones nativas de Radix sincronizadas con las variables de tiempo de CSS.
- **Velocidad**: Las animaciones de entrada/salida no deben superar los 300ms.

## 6. Tipografía y Localización

### Jerarquía Tipográfica
- **Serif (Playfair Display)**: Exclusiva para títulos de sección (H1, H2) y elementos que requieran un toque clásico y premium.
- **Sans (Inter/Outfit)**: Para cuerpo de texto, botones, etiquetas y navegación. Lectura clara y moderna.

### Localización e Invariantes
- **Moneda**: Es obligatorio el uso de la utilidad `formatCurrency`. 
- **Configuración**: El sistema debe operar bajo el locale `es-PA` (Español - Panamá) y mostrar siempre la moneda en **Balboas (PAB)**.
- **Visualización**: En la UI, el símbolo puede aparecer como "$" pero el formateo debe seguir las reglas de moneda panameña (punto decimal, coma de miles).

> [!CAUTION]
> Cualquier incumplimiento de estas normas estéticas resultará en el rechazo inmediato del código en la fase de revisión técnica. No hay espacio para la mediocridad visual en Tembleques Camila.
