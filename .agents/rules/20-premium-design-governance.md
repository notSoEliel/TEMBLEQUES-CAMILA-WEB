# Regla 20: Gobernanza de Profundidad y Animación

Esta regla establece los estándares para el movimiento y la tridimensionalidad en la interfaz de Tembleques Camila.

## 1. Sistema de Sombras (Elevación)
Para compensar la eliminación de los bordes gruesos del neobrutalismo, se utiliza un sistema de sombras sutiles que aportan profundidad sin ensuciar el diseño.
- **shadow-elegant**: Es la sombra base para tarjetas y contenedores. Debe ser suave, difuminada y con un tono basado en el color de fondo (nunca negro puro saturado).
- **shadow-elegant-lg**: Reservada para elementos flotantes (Popovers, Modales, Menús desplegables).
- **Prohibición**: No se permiten sombras duras (hard shadows) con desplazamiento sin blur.

## 2. Animaciones y Transiciones
La interfaz debe sentirse fluida y reactiva. Ningún cambio de estado debe ser instantáneo o brusco.
- **Herramientas**: Uso de las capacidades nativas de `Tailwind CSS`, `framer-motion` para transiciones de página, y las animaciones de `Radix UI` para componentes.
- **Estándar de Acordeón**: Las secciones desplegables (FAQ) deben usar las animaciones `accordion-down` y `accordion-up` definidas en el sistema.
- **Velocidad y Curva**: Las transiciones deben durar entre **200ms y 400ms** utilizando curvas de tipo `ease-in-out` o `out-expo` para un efecto orgánico.

## 3. Estados de Interacción (Micro-animaciones)
- **Hovers**: El cambio de estado al pasar el cursor debe ser sutil (ej. un ligero desplazamiento hacia arriba de 2px, un cambio suave de color de fondo o un aumento de la sombra).
- **Cargas (Skeletons)**: No se permiten pantallas en blanco. Se deben usar componentes `Skeleton` que animen su opacidad de forma pulsante mientras los datos se cargan.

## 4. Scroll y Navegación
- **Scroll Restoration**: Es obligatorio el uso del componente `ScrollToTop` para reiniciar la posición del scroll al cambiar de página.
- **Smooth Scroll**: El desplazamiento interno (como al cambiar de página en una lista) debe ser suave (`behavior: "smooth"`).

> [!TIP]
> Una buena animación es aquella que el usuario no nota conscientemente, pero que hace que la aplicación se sienta "viva" y de alta calidad.
