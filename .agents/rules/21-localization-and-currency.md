# Regla 21: Localización y Moneda (Balboas PAB)

Esta regla garantiza que la plataforma Tembleques Camila mantenga su identidad panameña y cumpla con los estándares locales de visualización de datos.

## 1. Moneda Oficial (Balboas)
La moneda oficial de la plataforma es el **Balboa (PAB)**. 
- **Invariabilidad**: Bajo ninguna circunstancia se debe mostrar "USD" como moneda principal, a menos que sea una opción de conversión secundaria solicitada por el usuario.
- **Símbolo**: Se utiliza el símbolo `$` seguido del monto, pero el formateo debe ser consistente con la moneda local.

## 2. Utilidad `formatCurrency` [MANDATORY]
Queda estrictamente prohibido formatear montos monetarios de forma manual mediante strings o templates.
- **Uso de la Utilidad**: Se debe usar la función `formatCurrency` ubicada en `@/lib/utils`.
- **Implementación**: Esta función debe utilizar `Intl.NumberFormat` con el locale `es-PA` y la moneda `PAB`.
- **Uso en JSX**: `{formatCurrency(amount)}`.

## 3. Configuración de Locale
- **Idioma**: El idioma predeterminado e inamovible de la interfaz es el **Español**.
- **Fechas**: Las fechas deben mostrarse siguiendo el formato regional de Panamá (ej. `DD/MM/YYYY`) utilizando `toLocaleDateString("es-PA")`.
- **Cero Spanglish**: Todos los mensajes de error, etiquetas de botones y textos informativos deben estar en un español impecable.

## 4. Precios por Talla
- Cuando un producto tiene variaciones de precio por talla, la UI debe mostrar el rango de precios (ej. `$150 - $200`) o el precio base seguido de un indicador de variabilidad.

> [!IMPORTANT]
> La identidad panameña no es solo estética, es también funcional. El respeto a nuestra moneda y formatos locales es una prioridad absoluta.
