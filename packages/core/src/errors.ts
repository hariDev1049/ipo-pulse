export type ProviderErrorCode = "RATE_LIMITED" | "UNAUTHORIZED" | "UNAVAILABLE" | "BAD_RESPONSE";

export class ProviderError extends Error {
  override readonly name = "ProviderError";
  readonly code: ProviderErrorCode;

  constructor(code: ProviderErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
  }
}