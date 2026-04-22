# PRD-TC.md  
# Tembleques Camila  
_Plataforma web de alquiler de vestimenta típica panameña y accesorios_

---

## 1. Resumen Ejecutivo

Tembleques Camila será una plataforma web B2C enfocada exclusivamente en el **alquiler de vestimenta típica panameña y accesorios folclóricos**. El sistema permitirá reservar productos por fechas, pagar en línea mediante Stripe y aceptar términos y condiciones obligatorios antes de completar cualquier reserva.

El objetivo es digitalizar el proceso de alquiler, reducir gestiones manuales y ofrecer una experiencia premium, intuitiva y moderna.

---

## 2. Estratégico del Modelo


### Modelo final:

- Alquiler de polleras
- Alquiler de vestuario masculino típico
- Alquiler infantil
- Alquiler de tembleques
- Alquiler de accesorios
- Paquetes completos para eventos

### Beneficios del cambio

- Inventario reutilizable
- Mayor rentabilidad por pieza
- Ingresos recurrentes
- Control de stock más simple
- Diferenciación clara

---

## 3. Objetivo Principal

Crear la plataforma digital líder en alquiler de vestimenta típica panameña.

---

# 4. Funcionalidades Principales

---

## 4.1 Landing Page

### Hero

**Alquila tradición panameña con elegancia**

### Secciones

- Catálogo destacado
- Cómo funciona
- Reserva en minutos
- Testimonios
- Preguntas frecuentes
- CTA principal

---

## 4.2 Usuario Cliente

### Registro/Login

- Crear cuenta
- Iniciar sesión
- Recuperar contraseña

### Perfil

- Datos personales
- Historial de alquileres
- Estado de reservas

### Catálogo

Filtros por:

- Tipo de vestuario
- Accesorios
- Talla
- Fecha disponible
- Precio

### Reserva

1. Seleccionar producto
2. Escoger fecha inicio y fin
3. Leer términos y condiciones
4. Aceptar checkbox obligatorio
5. Pagar con Stripe
6. Confirmación

---

## 4.3 Panel Administrador

### Dashboard

- Reservas activas
- Próximas devoluciones
- Ingresos mensuales
- Productos más alquilados

### Gestión de Inventario

- Crear productos
- Editar stock
- Marcar disponible / mantenimiento
- Imágenes

### Gestión de Reservas

- Aprobar reservas
- Entregado
- Devuelto
- Atrasado
- Dañado

### Usuarios

- Historial de cliente
- Incidencias

---

# 5. Términos y Condiciones (Obligatorio)

## Regla principal

Antes de pagar, el usuario debe aceptar términos mediante checkbox obligatorio.

### Texto resumido:

El cliente acepta devolver el producto en las mismas condiciones en que fue entregado.

En caso de pérdida, daño, rotura, manchas permanentes o deterioro causado durante el alquiler, el cliente asume la responsabilidad total del costo de reparación o reposición.

Si el alquiler corresponde únicamente a accesorios (tembleques, peinetas, joyería, etc.), el cliente será responsable en su totalidad por cualquier daño o pérdida del artículo.

Retrasos en devolución podrán generar cargos adicionales.

### UX Requerida

- Checkbox obligatorio
- Link a términos completos
- No permitir checkout sin aceptación
- Guardar timestamp de aceptación

---

# 6. Stripe Integración

## MVP

- Pago online
- Confirmación automática
- Reserva validada tras pago exitoso

## Futuro

- Depósito de garantía
- Cobro adicional por daños
- Penalidad por atraso

---

# 7. Base de Datos (MongoDB)

La base de datos oficial del proyecto será **MongoDB** , diseñada para flexibilidad en catálogos, reservas y trazabilidad de estados.

## Motor y lineamientos

- Motor: MongoDB
- Modelado: colecciones por dominio
- Identificadores: `ObjectId`
- Trazabilidad: timestamps (`createdAt`, `updatedAt`) en documentos críticos
- Índices obligatorios para disponibilidad y consultas frecuentes

## Users

- _id
- name
- email
- role
- phone
- createdAt
- updatedAt

## Products

- _id
- name
- category
- rental_price
- stock
- condition_status
- size
- images
- availability_calendar
- createdAt
- updatedAt

## Rentals

- _id
- user_id (ObjectId)
- product_id (ObjectId)
- start_date
- end_date
- total
- status
- payment_status
- terms_accepted
- createdAt
- updatedAt

## TermsAcceptance

- _id
- user_id (ObjectId)
- rental_id (ObjectId)
- accepted_at
- ip_address
- user_agent

## Índices mínimos requeridos

- `Products`: índice por `category`, `stock`, `condition_status`
- `Rentals`: índice compuesto por `product_id`, `start_date`, `end_date`
- `Users`: índice único por `email`
- `TermsAcceptance`: índice por `rental_id`, `accepted_at`

---

# 8. Estados de Reserva

- pending
- paid
- confirmed
- delivered
- returned
- late
- damaged
- cancelled

---

# 9. Diseño UI

## Estilo

Minimalista, elegante, femenino-premium.


## Principios UX

- Reserva en menos de 3 minutos
- Mobile first
- Interfaz limpia
- Calendario simple

---

# 10. Flujo Usuario

Landing → Catálogo → Producto → Fecha → Términos → Stripe → Confirmación

---

# 11. KPI MVP

- Reservas mensuales
- Tasa de conversión
- Tiempo promedio de reserva
- Productos más solicitados
- Incidencias por daño

---

# 12. Diferenciador

No es solo alquiler de ropa.  
Es alquiler premium de identidad cultural panameña con gestión digital profesional.

---

# 13. Definición de Éxito

En 90 días:

- 50 usuarios registrados
- 20 reservas completadas
- Conversión >2%
- Operación sin doble reservas
- Sistema funcional de devoluciones

---

# 14. Copy Hero

**La tradición se luce mejor cuando se reserva fácil.**

CTA:

- Reservar Ahora
- Ver Catálogo

---

# 15. Requerimientos Técnicos de Infraestructura (Docker)

La solución debe ejecutarse en contenedores para asegurar consistencia entre desarrollo, pruebas y despliegue.

## Alcance Docker mínimo

- Contenedor para frontend
- Contenedor para backend/API
- Contenedor para MongoDB
- Red interna para comunicación entre servicios
- Persistencia de datos con volumen para MongoDB

## Entornos requeridos

- Desarrollo local con `docker compose`
- Entorno de testing automatizado con `docker compose`
- Configuración por variables de entorno (`.env`)

## Criterios de aceptación de infraestructura

- Levantar todo el sistema con un solo comando
- Reinicio de servicios sin pérdida de datos persistentes
- Health checks para API y base de datos
- Documentación de arranque y troubleshooting

---

# 16. Estrategia de Testing (Unitario + End-to-End)

La plataforma debe incluir cobertura de calidad automatizada en dos niveles: unitario y end-to-end.

## 16.1 Testing Unitario

Objetivo: validar lógica de negocio aislada.

Cobertura mínima:

- Reglas de disponibilidad de inventario
- Cálculo de total de alquiler
- Validaciones de fechas
- Flujo de aceptación de términos
- Permisos por rol (cliente/admin)

Meta recomendada:

- Cobertura mínima global de 80% en módulos críticos

## 16.2 Testing End-to-End

Objetivo: validar flujos completos desde interfaz hasta persistencia.

Flujos obligatorios:

- Registro de usuario
- Login
- Búsqueda y filtrado en catálogo
- Proceso completo de reserva
- Bloqueo de checkout sin aceptación de términos
- Pago exitoso y confirmación
- Gestión de reserva en panel administrador

## 16.3 Integración en pipeline

- Ejecutar pruebas unitarias en cada pull request
- Ejecutar pruebas E2E en rama principal y antes de release
- Publicar reportes de resultados y evidencias (capturas/logs)

---

# 17. Documentación Integral del Proyecto

El proyecto debe contar con documentación completa, clara y mantenible para usuarios técnicos y no técnicos.

## 17.1 Documentación funcional

- Alcance del producto y reglas de negocio
- Historias de usuario y criterios de aceptación
- Flujos principales (cliente y administrador)
- Política de términos y condiciones

## 17.2 Documentación técnica

- Arquitectura general (frontend, backend, MongoDB)
- Modelo de datos MongoDB y colecciones
- API (endpoints, request/response, errores)
- Variables de entorno requeridas
- Guía de Docker y Docker Compose

## 17.3 Documentación de calidad

- Estrategia de testing unitario
- Estrategia de testing E2E
- Cómo ejecutar pruebas localmente y en CI
- Matriz de cobertura y trazabilidad

## 17.4 Entregables de documentación

- README principal actualizado
- Guía rápida de instalación
- Guía de ejecución de pruebas
- Registro de decisiones técnicas (ADR ligero)
- Evidencias visuales de pruebas E2E

---