# Requerimientos del Sistema (REQUIREMENTS.md)

Este documento describe los requerimientos funcionales y no funcionales explícitos para la plataforma de alquiler folclórico **Tembleques Camila**.

---

## 1. Requerimientos Funcionales (RF)

### 1.1. Gestión de Catálogo y Búsqueda
- **RF-01 (Búsqueda de Productos):** El sistema debe permitir a los usuarios buscar productos por coincidencia de nombre o descripción.
- **RF-02 (Filtros de Catálogo):** El usuario debe poder filtrar la lista de productos por categorías (Polleras, Tembleques, Accesorios, etc.) y tallas.
- **RF-03 (Filtro por Fechas):** El usuario debe poder ingresar un rango de fechas (Inicio y Fin) para filtrar únicamente los artículos que cuenten con stock disponible para ese período.

### 1.2. Ficha del Producto y Disponibilidad
- **RF-04 (Selección de Tallas):** El sistema debe desglosar las variantes de talla de cada prenda, indicando la cantidad en stock disponible e inhabilitando aquellas en mantenimiento.
- **RF-05 (Precios por Variante):** Se debe permitir establecer precios especiales por variante de talla (Price Overrides), los cuales deben sustituir al precio base al seleccionarse la talla.
- **RF-06 (Calendario de Disponibilidad):** Se debe incluir un calendario interactivo en tiempo real que muestre los días libres y bloquee los días con reservas previas completadas que agoten el stock.
- **RF-07 (Corte de Reservas Diario):** De acuerdo a las políticas logísticas, las reservas para el día siguiente solo serán permitidas hasta las **6:00 PM** (Hora de Panamá). Posterior a esa hora, la fecha mínima seleccionable se desplazará al día subsiguiente.

### 1.3. Carrito y Checkout
- **RF-08 (Gestión de Carrito):** Los usuarios autenticados deben poder agregar múltiples ítems al carrito especificando talla, cantidad y rango de fechas por separado.
- **RF-09 (Aceptación de Términos y Condiciones):** Es **obligatorio** que el usuario marque un checkbox de términos y condiciones antes de proceder al pago. El backend debe bloquear cualquier creación de reserva si no se valida este flag.
- **RF-10 (Registro de Auditoría Legal):** Al aceptar los términos, el sistema debe registrar en la base de datos la dirección IP, el User Agent del navegador y la marca de tiempo (timestamp) de aceptación.
- **RF-11 (Modalidad de Reserva del 25%):** El usuario debe poder seleccionar si pagar la totalidad del alquiler (100%) o únicamente el abono de reserva del 25% para asegurar el artículo, abonando el saldo restante en la tienda física.
- **RF-12 (Integración Financiera con Stripe):** Las reservas deben procesarse mediante Stripe Checkout (sandbox), bloqueando la confirmación de la reserva en el backend hasta que se reciba el webhook firmado de Stripe confirmando el cobro.

### 1.4. Panel de Administración
- **RF-13 (Dashboard Operativo):** Debe mostrar métricas críticas del mes actual (total de alquileres, reservas pendientes, próximas devoluciones, ingresos facturados).
- **RF-14 (Gestión de Inventario Admin):** Los administradores deben poder crear, editar y archivar productos, variantes de talla, stock inicial e imágenes.
- **RF-15 (Trazabilidad del Alquiler):** Se debe poder actualizar el estado de una reserva (Aprobado, Entregado, Devuelto, Con Daños, Atrasado).
- **RF-16 (Ajuste de Reglas de Negocio):** El administrador podrá editar categorías y tallas globales de forma dinámica en la base de datos.

---

## 2. Requerimientos No Funcionales (RNF)

### 2.1. Localización y Moneda Nacional
- **RNF-01 (Moneda Balboa):** Toda la interfaz pública y el panel administrativo deben mostrar los montos exclusivamente en **Balboas (PAB)** con el símbolo `$`. Queda prohibido el uso de la sigla "USD".
- **RNF-02 (Formateo Centralizado):** El formateo de montos debe realizarse a través de la función utilitaria `formatCurrency(amount)` configurada para la región `es-PA`.
- **RNF-03 (Idioma):** Todo el contenido textual, mensajes de error y flujos de usuario deben estar en español impecable, evitando mezclas de lenguajes o Spanglish.

### 2.2. Diseño Estético y UX Premium
- **RNF-04 (Estilo Lujo Silencioso):** El diseño visual debe ser minimalista, elegante y limpio, priorizando colores suaves de acento sobre gradientes saturados, y tipografías Serif para títulos descriptivos.
- **RNF-05 (Radio de Bordes Pill-Shaped):** Por regla obligatoria de diseño, todas las tarjetas, botones e inputs deben usar un radio de curvatura por defecto de **2rem** (`--radius: 2rem`).
- **RNF-06 (No Dependencia de Hover):** Ninguna acción clave o flujo crítico de navegación o compra debe estar oculta detrás de estados hover. En móviles todo debe ser accesible a un toque (Mobile First).

### 2.3. Robustez Técnica y Calidad
- **RNF-07 (TypeScript Estricto):** Todo el código de la aplicación frontend y backend debe desarrollarse en modo estricto de TypeScript, prohibiendo el uso del tipo genérico `any`.
- **RNF-08 (Manejo de Errores Seguro):** El backend debe canalizar los errores a través de un handler global que oculte detalles internos de base de datos o stack traces, retornando códigos de error comprensibles (`AUTH_TOKEN_REQUIRED`, `PRODUCT_DATES_UNAVAILABLE`, etc.).
- **RNF-09 (Containerización):** El frontend, backend y base de datos deben poder desplegarse localmente de forma automatizada mediante Docker y Docker Compose en una red privada y aislada.
- **RNF-10 (Cobertura QA):** Los flujos clave de negocio (autenticación, catálogo, checkout bloqueado sin términos y flujo de pago simulado) deben estar automatizados mediante una suite de pruebas Playwright.
