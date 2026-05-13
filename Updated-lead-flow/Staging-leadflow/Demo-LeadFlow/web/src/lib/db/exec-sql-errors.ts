/** Thrown when a Supabase `exec_sql` RPC row cannot be normalized to a plain object record. */
export class ExecSqlShapeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ExecSqlShapeError";
  }
}
