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

### Implementación en Mongoose
Se debe usar `countDocuments` para el total y `.skip()`, `.limit()` para la consulta.

```typescript
const page = Number(c.req.query("page")) || 1;
const limit = Number(c.req.query("limit")) || 10;
const skip = (page - 1) * limit;

const [data, total] = await Promise.all([
  Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
  Model.countDocuments(filter)
]);

return c.json({
  data,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
});
```

## 2. Estándar de Frontend (UI)

### Componente Reutilizable
Se debe crear un componente `Pagination` en `frontend/src/components/ui/pagination.tsx` que siga la estética Neobrutalista del proyecto.

### Comportamiento
- Debe mostrar el número de página actual.
- Botones "Anterior" y "Siguiente".
- Botones para páginas específicas si el número de páginas es manejable, o un selector si son muchas.
- Sincronización con los parámetros de la URL (`URLSearchParams`) para permitir compartir links paginados.

## 3. Áreas de Aplicación Obligatoria
- **Admin**: Inventario, Reservas, Usuarios, Configuraciones, Categorías, Grupos de tallas.
- **Cliente**: Catálogo de productos, Historial de alquileres.
- **General**: Cualquier nueva lista que supere los 10 elementos.

## 4. Estética Neobrutalista
Los botones de paginación deben mantener:
- `border-2 border-black`
- `shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`
- Estados hover/active con cambio de color sólido (ej. `hover:bg-yellow-400`).
