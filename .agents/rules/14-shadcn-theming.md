# Regla 14: Estandarización de UI con shadcn/ui y OKLCH

Esta regla garantiza la coherencia técnica del frontend mediante el uso de herramientas de diseño estandarizadas y sistemas de color modernos.

## 1. Exclusividad de shadcn/ui y Radix UI
Queda prohibida la creación de componentes de UI manuales o el uso de librerías de componentes externas no autorizadas.
- **Base Obligatoria**: Todo elemento (Botones, Inputs, Modales, Tabs, etc.) debe ser una instancia de `shadcn/ui`.
- **Accesibilidad**: Se debe delegar la lógica de interacción compleja a las primitivas de `Radix UI` para garantizar el cumplimiento de estándares WAI-ARIA.

## 2. Sistema de Color OKLCH [MANDATORY]
No se permite el uso de formatos de color antiguos (HEX, RGB, HSL) en el código del frontend.
- **Implementación**: Todos los colores deben definirse en `index.css` utilizando la función `oklch()`.
- **Uso en JSX**: Se deben usar exclusivamente las clases de utilidad de Tailwind que mapeen a las variables del tema (ej. `text-primary`, `bg-background`, `border-border/40`).

## 3. Geometría de Radios
- **Token Central**: El radio por defecto (`--radius`) es de **2rem**.
- **Consistencia**: Este radio debe aplicarse a todos los elementos interactivos principales para generar un aspecto "pill-shaped" característico de la marca.
- **Anidación**: Los elementos dentro de contenedores redondeados deben usar radios proporcionales (ej. si el contenedor es `rounded-3xl`, el hijo puede ser `rounded-xl`) para mantener la armonía óptica.

## 4. Tematización y Tailwind v4
- **CSS Variables**: El tema de Tailwind debe alimentarse directamente de las variables CSS de `index.css`.
- **Personalización**: Las modificaciones a los componentes de shadcn deben hacerse a través de `@layer components` o extendiendo el bloque `@theme` en el CSS, nunca mediante estilos inline agresivos.

> [!CAUTION]
> El uso de colores manuales o bordes que no pertenezcan al sistema de diseño se considera una violación crítica de esta regla.
