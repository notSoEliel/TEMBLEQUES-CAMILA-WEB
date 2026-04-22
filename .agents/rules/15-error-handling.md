# Error Handling Pattern

## Rule

All errors in this project must follow a single, consistent pattern.  
Do **not** invent a new approach — use what is described below.

---

## Backend

### 1. Throw `AppError`, never `Error`

```ts
// ✅ Correcto
throw new AppError("Credenciales inválidas", 401, "AUTH_INVALID_CREDENTIALS");

// ❌ Incorrecto
throw new Error("Credenciales invalidas");
return c.json({ error: "..." }, 401);
```

Import from: `../lib/errors.js`

### 2. Never expose `error.message` directly from MongoDB/Mongoose

The global handler in `index.ts` formats all `AppError` instances.  
For unexpected errors (DB crashes, etc.) it returns a safe generic message — never a stack trace.

### 3. Routes must NOT wrap in try-catch for AppError

Routes throw, the global handler catches. Only wrap in try-catch if you need to add fallback logic that isn't a simple error.

```ts
// ✅ Correcto — AppError bubbles up to global handler
const product = await Product.findById(id);
if (!product) throw new AppError("Producto no encontrado", 404, "PRODUCT_NOT_FOUND");

// ❌ Incorrecto — swallows AppError and loses status code
try {
  const product = await Product.findById(id);
  if (!product) return c.json({ error: "..." }, 404);
} catch (err: any) {
  return c.json({ error: err.message }, 500);
}
```

### 4. All messages in Spanish with correct accents

| ❌ Before | ✅ After |
|---|---|
| `"Credenciales invalidas"` | `"Credenciales inválidas"` |
| `"Token invalido o expirado"` | `"Token inválido o expirado"` |
| `"La contrasena..."` | `"La contraseña..."` |
| `"terminos"` | `"términos"` |

### 5. Error code reference

| Code | HTTP | When |
|---|---|---|
| `AUTH_TOKEN_REQUIRED` | 401 | No Bearer token in header |
| `AUTH_TOKEN_INVALID` | 401 | JWT malformed or expired |
| `AUTH_USER_NOT_FOUND` | 401 | Token valid but user deleted |
| `AUTH_INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `AUTH_EMAIL_TAKEN` | 400 | Email already registered |
| `AUTH_FORBIDDEN` | 403 | User role is not admin |
| `PRODUCT_NOT_FOUND` | 404 | Product ID doesn't exist |
| `PRODUCT_NOT_AVAILABLE` | 409 | Product condition ≠ disponible |
| `PRODUCT_DATES_UNAVAILABLE` | 409 | Dates overlap with existing rental |
| `RENTAL_TERMS_NOT_ACCEPTED` | 400 | termsAccepted = false |
| `RENTAL_INVALID_DATE_RANGE` | 400 | startDate >= endDate |
| `RENTAL_DATE_IN_PAST` | 400 | startDate in the past |
| `RENTAL_NOT_FOUND` | 404 | Rental ID doesn't exist |
| `RENTAL_INVALID_TRANSITION` | 400 | Invalid status transition |
| `RENTAL_STATUS_REQUIRED` | 400 | Missing status in PATCH body |
| `VALIDATION_ERROR` | 400 | Zod schema failed (any route) |
| `INTERNAL_ERROR` | 500 | Unexpected server exception |

---

## Frontend

### 1. Use `ErrorPage` for route-level errors

```tsx
// Full pages for access control and 404
<ErrorPage variant="not-found" />          // 404 — unknown URL
<ErrorPage variant="product-not-found" />  // 404 — specific product
<ErrorPage variant="unauthorized" />       // 401 — not logged in
<ErrorPage variant="session-expired" />    // 401 — token expired mid-session
<ErrorPage variant="forbidden" />          // 403 — wrong role
<ErrorPage variant="server-error" />       // 500 — unexpected crash
```

All `ErrorPage` variants include a **back button** and a **primary action button**.

### 2. Use `useErrorModal` for in-page errors

```tsx
const { errorModal, showError } = useErrorModal();

// In JSX:
{errorModal}

// On catch:
catch (err: any) {
  showError(err.message, "generic");  // or "network", "unauthorized", etc.
}
```

Never use `window.alert()` or bare `<div>` error banners for catch blocks.  
The modal variant communicates the *type* of error visually (icon + title).

### 3. Inline errors (form fields) are OK

For real-time form validation (before submission) a small inline `<p className="text-destructive">` under the field is fine.  
Reserve the modal for errors that happen *after* an API call.

### 4. `api.ts` already handles these cases

| Situation | Message shown |
|---|---|
| Network error (no connection) | "No se pudo conectar con el servidor. Verifica tu conexión a internet." |
| Server non-JSON response | "El servidor respondió con un error inesperado (STATUS). Intenta de nuevo más tarde." |
| Server JSON with `error` field | The exact message from the backend |
| Server JSON without `error` field | "Ocurrió un error inesperado. Por favor, intenta de nuevo." |
