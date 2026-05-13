/** Application-level error with optional structured details (e.g. Zod flatten). */
export class AppError extends Error {
  readonly details?: unknown;

  constructor(message: string, details?: unknown, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.details = details;
  }
}
