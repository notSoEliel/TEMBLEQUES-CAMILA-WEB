# Reglas de shadcn/ui y Tematización - Tembleques Camila

Para asegurar una interfaz coherente y premium, el uso de componentes de UI y estilos debe seguir estas directrices.

## 1. Uso de shadcn/ui
- **Base de Componentes**: Todos los componentes de interfaz (botones, inputs, diálogos, etc.) deben basarse en **shadcn/ui**.
- **Instalación**: Utilizar `bunx shadcn@latest add [component]` para añadir nuevos componentes.
- **Personalización**: No usar los estilos por defecto de shadcn si entran en conflicto con la estética del PRD. Ajustar los componentes para que usen las variables definidas en `index.css`.

## 2. Fuente de Verdad del Tema (`index.css`)
- El archivo `index.css` es la única fuente de verdad para el sistema de diseño.
- **Variables CSS**: Se utiliza **OKLCH** para los colores, lo que permite una mayor precisión y consistencia en el brillo y matiz.
- **Sincronización**: Al crear o modificar el frontend, asegúrate de que `index.css` esté importado en el punto de entrada principal (ej. `main.tsx` o `App.tsx`).

## 3. Estética Neobrutalista Premium
El tema definido en `index.css` tiene una inclinación Neobrutalista refinada que debe respetarse:
- **Sombras (Shadows)**: No usar las sombras suaves por defecto de Tailwind. Usar las clases `shadow-sm`, `shadow-md`, `shadow-lg`, etc., que están mapeadas a sombras sólidas con color `hsl(0 0% 0% / 1.00)`.
- **Bordes y Radios**:
  - El radio por defecto (`--radius`) es de `2rem`, lo que da un aspecto muy redondeado/pill-shaped.
  - Los bordes deben usar la variable `--border` (actualmente negro sólido).
- **Tipografía**:
  - `font-sans`: Inter (para lectura general).
  - `font-serif`: Georgia (para títulos elegantes o acentos premium).
  - `font-mono`: JetBrains Mono (para datos técnicos).

## 4. Modo Oscuro
- El sistema soporta modo oscuro mediante la clase `.dark`.
- Las variables OKLCH se redefinen automáticamente al aplicar la clase. Asegúrate de que los componentes de shadcn utilicen las variables (ej. `bg-background`, `text-foreground`) para que la transición sea fluida.

## 5. Implementación en Frontend
- Cuando se inicialice el `frontend/`, el archivo `index.css` debe ubicarse en `frontend/src/index.css` (o ruta equivalente de Vite) para que Tailwind v4 procese correctamente el bloque `@theme`.
