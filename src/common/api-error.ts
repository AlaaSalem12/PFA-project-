export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Array<{ field: string; message: string }> = [],
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
