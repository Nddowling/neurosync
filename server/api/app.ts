import { randomUUID } from 'node:crypto';
import { z, ZodError } from 'zod';
import { Identity, denyAuthentication, type IdentityVerifier } from '../auth/identity.js';
import type { Patients } from '../repositories/patients.js';
import { recordId } from '../domain/patient.js';
import { ApiError } from './errors.js';
import { RateLimit } from '../security/rate-limit.js';
import { safeLogger, type SafeLogger } from '../security/log.js';

export const MAX_BODY_BYTES = 32768;
async function readJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0]?.trim() !== 'application/json') throw new ApiError(415, 'unsupported_media_type');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_request');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new ApiError(413, 'payload_too_large');
      }
      chunks.push(chunk.value);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; }
    catch { throw new ApiError(400, 'invalid_request'); }
  } finally { reader.releaseLock(); }
}
const pagination = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
}).strict();
export function createApp(options: { patients: Pick<Patients, 'list' | 'get' | 'create' | 'update' | 'delete'>; verifier?: IdentityVerifier; logger?: SafeLogger; limiter?: RateLimit }) {
  const verifier = options.verifier ?? denyAuthentication;
  const log = options.logger ?? safeLogger;
  const limiter = options.limiter ?? new RateLimit();
  return async (request: Request): Promise<Response> => {
    const requestId = randomUUID();
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
      'X-Frame-Options': 'DENY', 'X-Request-Id': requestId };
    let status = 200;
    let data: unknown;
    try {
      const url = new URL(request.url);
      if (url.pathname === '/api/health' && request.method === 'GET') {
        data = { status: 'ok', service: 'neurosync-api' }; // liveness, not deployment/auth readiness
      } else {
        const identity = await Identity.authenticate(request, verifier);
        if (!limiter.allow(identity.subject)) throw new ApiError(429, 'rate_limited');
        const match = /^\/api\/patients(?:\/([^/]+))?$/.exec(url.pathname);
        if (!match) throw new ApiError(404, 'not_found');
        const id = match[1] ? recordId.parse(match[1]) : undefined;
        if (request.method === 'GET' && !id) {
          const query = pagination.parse(Object.fromEntries(url.searchParams));
          data = { data: await options.patients.list(identity, query.limit, query.offset) };
        } else if (request.method === 'GET' && id) {
          if (url.search) throw new ApiError(400, 'invalid_request');
          const result = await options.patients.get(identity, id);
          if (!result) throw new ApiError(404, 'not_found');
          data = { data: result };
        } else if (request.method === 'POST' && !id) {
          if (url.search) throw new ApiError(400, 'invalid_request');
          data = { data: await options.patients.create(identity, await readJson(request)) };
          status = 201;
        } else if (request.method === 'PATCH' && id) {
          if (url.search) throw new ApiError(400, 'invalid_request');
          const result = await options.patients.update(identity, id, await readJson(request));
          if (!result) throw new ApiError(404, 'not_found');
          data = { data: result };
        } else if (request.method === 'DELETE' && id) {
          if (url.search) throw new ApiError(400, 'invalid_request');
          if (!await options.patients.delete(identity, id)) throw new ApiError(404, 'not_found');
          status = 204;
        } else throw new ApiError(405, 'method_not_allowed');
      }
    } catch (error) {
      const failure = error instanceof ApiError ? error : error instanceof ZodError
        ? new ApiError(400, 'invalid_request') : new ApiError(500, 'internal_error');
      status = failure.status;
      data = { error: failure.code, requestId };
    }
    log({ requestId, status, event: status >= 500 ? 'request_failed' : 'request_complete' });
    return status === 204 ? new Response(null, { status, headers }) : Response.json(data, { status, headers });
  };
}
