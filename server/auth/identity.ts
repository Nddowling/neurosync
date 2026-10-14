import { z } from 'zod';
import { ApiError } from '../api/errors.js';

const claimsSchema = z.object({ subject: z.string().min(1).max(256) }).strict();
export interface IdentityVerifier {
  // Implementations must verify signature/issuer/audience/expiry or a server session.
  // Returned subject is an owned, stable clinician key, not an email or browser field.
  verify(request: Request): Promise<{ subject: string } | null>;
}
const authenticated = new WeakSet<Identity>();
export class Identity {
  private constructor(readonly subject: string) {
    authenticated.add(this);
    Object.freeze(this);
  }
  static async authenticate(request: Request, verifier: IdentityVerifier): Promise<Identity> {
    const claims = claimsSchema.safeParse(await verifier.verify(request));
    if (!claims.success) throw new ApiError(401, 'unauthorized');
    return new Identity(claims.data.subject);
  }
  static require(value: unknown): asserts value is Identity {
    if (!(value instanceof Identity) || !authenticated.has(value)) throw new ApiError(401, 'unauthorized');
  }
}
// Safe default during foundation phase. No development header or dummy production login.
export const denyAuthentication: IdentityVerifier = { verify: async () => null };
