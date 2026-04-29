# Regla 19: Verificación de Tipos Estricta (Strict Type Checking)

Esta regla establece el procedimiento obligatorio para garantizar la integridad técnica del código TypeScript en el frontend de Tembleques Camila.

## Contexto
Para evitar la proliferación de errores en tiempo de ejecución y asegurar una base de código mantenible, el agente de IA debe actuar como el primer filtro de calidad técnica.

## Instrucción Vinculante [MANDATORY]
Cada vez que el agente modifique o cree un archivo con extensión `.ts` o `.tsx` dentro de la carpeta `frontend/`, **DEBE** ejecutar de forma autónoma el siguiente comando antes de dar por terminada la tarea:

```bash
cd frontend && bun x tsc --noEmit
```

## Protocolo de Ejecución
1.  **Modificación**: El agente aplica los cambios solicitados en el código.
2.  **Verificación**: El agente ejecuta el comando de comprobación de tipos mencionado arriba.
3.  **Análisis de Resultado**:
    -   **Si el comando devuelve errores**: El agente tiene PROHIBIDO presentar el código al usuario. Debe analizar los errores, corregirlos de forma iterativa y volver a ejecutar la verificación.
    -   **Si el comando finaliza con éxito (exit code 0)**: El agente puede proceder a informar al usuario sobre la finalización de la tarea.

## Restricciones
-   No se permiten soluciones basadas en `@ts-ignore` o `@ts-nocheck` a menos que exista una limitación técnica extrema de una librería externa (y debe ser documentada).
-   El uso de `any` sigue estando estrictamente prohibido (Regla 01). Esta regla asegura que esa prohibición se cumpla mecánicamente.

> [!IMPORTANT]
> El cumplimiento de esta regla no es opcional. Un agente que presenta código con errores de TypeScript ha fallado en su misión principal.
