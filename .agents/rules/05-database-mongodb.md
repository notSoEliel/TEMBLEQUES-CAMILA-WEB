# Reglas de Base de Datos - Tembleques Camila

La base de datos oficial del proyecto será **MongoDB**, diseñada para flexibilidad en catálogos, reservas y trazabilidad de estados.

## Motor y Lineamientos
- Motor: MongoDB (Mongoose).
- Modelado: Colecciones separadas por dominio.
- Identificadores: `ObjectId`.
- Trazabilidad: Timestamps (`createdAt`, `updatedAt`) obligatorios en documentos críticos.
- Índices: Obligatorios para campos de consulta frecuente y disponibilidad.

## Colecciones Principales

### Users
- `_id`, `name`, `email`, `role`, `phone`, `createdAt`, `updatedAt`

### Products
- `_id`, `name`, `category`, `rental_price`, `stock`, `condition_status`, `size`, `images`, `availability_calendar`, `createdAt`, `updatedAt`

### Rentals
- `_id`, `user_id` (ObjectId), `product_id` (ObjectId), `start_date`, `end_date`, `total`, `status`, `payment_status`, `terms_accepted`, `createdAt`, `updatedAt`

### TermsAcceptance
- `_id`, `user_id` (ObjectId), `rental_id` (ObjectId), `accepted_at`, `ip_address`, `user_agent`

## Índices Mínimos Requeridos
- `Products`: índice por `category`, `stock`, `condition_status`.
- `Rentals`: índice compuesto por `product_id`, `start_date`, `end_date`.
- `Users`: índice único por `email`.
- `TermsAcceptance`: índice por `rental_id`, `accepted_at`.
