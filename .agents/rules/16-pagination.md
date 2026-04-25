# Regla de Paginación (PAGINATION.md)

Esta regla define el estándar para la implementación de paginación en toda la plataforma Tembleques Camila.

## 1. Estándar de Backend (API)

Todas las rutas que devuelvan listas de elementos deben soportar los parámetros `page` y `limit`.

### Parámetros de Query
- `page`: Número de página (empezando en 1). Valor por defecto: `1`.
- `limit`: Cantidad de elementos por página. Valor por defecto: `10`.

### Estructura de Respuesta
La respuesta debe incluir los datos y un objeto de metadatos de paginación.

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

## 2. Estándar de Frontend (UI)

### Componente Reutilizable
Se debe usar el componente `Pagination` en `frontend/src/components/ui/Pagination.tsx`. 

### Comportamiento y UX
- **Estética Premium**: Evitar sombras y bordes excesivos en la paginación para mantener un look limpio y profesional.
- **Selector de Cantidad**: Debe incluir un selector para cambiar el `limit` (ej. 10, 20, 50 por página).
- **Sincronización con URL**: La página actual y el límite deben estar sincronizados con los parámetros de la URL (`URLSearchParams`).
- **Navegación**: Botones "Anterior", "Siguiente" y acceso directo a páginas.
- **Scroll**: Al cambiar de página, realizar un scroll suave al inicio de la lista.

## 3. Áreas de Aplicación Obligatoria
- **Admin**: Inventario, Reservas, Usuarios.
- **Cliente**: Catálogo de productos, Historial de alquileres.

## 4. Diseño y Estilos
- Usar el sistema de diseño de la aplicación pero de forma sutil.
- El botón de página activa debe ser claramente distinguible.
- Los botones deshabilitados (ej. "Anterior" en página 1) deben ser visualmente neutros.
