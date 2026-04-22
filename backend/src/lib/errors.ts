/**
 * Custom application error class.
 *
 * Use this instead of `throw new Error(...)` in all services and routes.
 * The global error handler in `index.ts` catches these and formats the HTTP response.
 *
 * @example
 *   throw new AppError("Credenciales inválidas", 401, "AUTH_INVALID_CREDENTIALS");
 */
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
    // Maintains proper prototype chain in transpiled environments
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
