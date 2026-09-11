import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import { Identity, type IdentityVerifier } from './identity.js';
import { withIdentity } from '../db/transaction.js';
import { ApiError } from '../api/errors.js';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function cookie(request: Request, name: string): string | undefined {
  const entries = request.headers.get('cookie')?.split(';').map(item => item.trim().split('=')) ?? [];
  const matches = entries.filter(([key]) => key === name);
  return matches.length === 1 ? matches[0]?.[1] : undefined;
}
export function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a,b);
}
export class Sessions implements IdentityVerifier {
  readonly cookieName: string;
  constructor(private pool: Pool, readonly origin: string, readonly secure: boolean) {
    if (new URL(origin).origin !== origin) throw new Error('APP_ORIGIN must be an origin');
    if (secure && !origin.startsWith('https://')) throw new Error('Production requires HTTPS');
    this.cookieName = secure ? '__Host-neurosync' : 'neurosync_session';
  }
  setCookie(name: string, value: string, maxAge: number) {
    return `${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${this.secure ? '; Secure' : ''}`;
  }
  assertOrigin(request: Request) {
    if (request.headers.get('origin') !== this.origin) throw new ApiError(403, 'forbidden');
  }
  async resolve(request: Request): Promise<{ subject: string; csrfHash: string } | null> {
    const token = cookie(request,this.cookieName);
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const result = await this.pool.query<{ owner_uid: string; csrf_hash: string }>('select * from neurosync_auth.session_resolve($1)',[digest(token)]);
    const row = result.rows[0];
    return row ? { subject: row.owner_uid, csrfHash: row.csrf_hash } : null;
  }
  async verify(request: Request) {
    const session = await this.resolve(request);
    if (!session) return null;
    if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
      this.assertOrigin(request);
      const csrf = request.headers.get('x-csrf-token');
      if (!csrf || !sameSecret(digest(csrf),session.csrfHash)) throw new ApiError(403, 'forbidden');
    }
    return { subject: session.subject };
  }
  async create(subject: string, assurance: string) {
    const identity = await Identity.authenticate(new Request(this.origin), { verify: async () => ({ subject }) });
    const token = secret(); const csrf = secret();
    await withIdentity(this.pool,identity, client => client.query('select neurosync_auth.session_create($1,$2,$3)',[digest(token),digest(csrf),assurance]));
    // CSRF token supplied in readable cookie; auth session remains HttpOnly.
    return { cookie: this.setCookie(this.cookieName,token,28800), csrfCookie: `neurosync_csrf=${csrf}; SameSite=Lax; Path=/; Max-Age=28800${this.secure ? '; Secure' : ''}` };
  }
  async logout(request: Request, identity: Identity) {
    const token = cookie(request,this.cookieName);
    await withIdentity(this.pool,identity,client => client.query('select neurosync_auth.session_revoke($1)',[digest(token ?? '')]));
    return [this.setCookie(this.cookieName,'',0), 'neurosync_csrf=; SameSite=Lax; Path=/; Max-Age=0'];
  }
}
