export type ErrorCode = 'unauthorized' | 'forbidden' | 'service_unavailable' | 'conflict' | 'limit_reached' | 'invalid_request' | 'not_found' | 'method_not_allowed'
  | 'payload_too_large' | 'unsupported_media_type' | 'rate_limited' | 'internal_error';
export class ApiError extends Error {
  constructor(readonly status: number, readonly code: ErrorCode) { super(code); }
}
