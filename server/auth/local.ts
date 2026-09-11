import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
const derive = (password: string,salt: string) => new Promise<Buffer>((resolve,reject) => {
  scrypt(password,salt,64,{ N: 32768,r:8,p:1,maxmem:64*1024*1024 },(error,value) => error ? reject(error) : resolve(value));
});
export async function hashPassword(password: string) {
  if (password.length<12 || password.length>256) throw new Error('Use a password between 12 and 256 characters');
  const salt=randomBytes(16).toString('hex');
  return `scrypt-v1:${salt}:${(await derive(password,salt)).toString('hex')}`;
}
export async function verifyLocalLogin(pool: Pool,email: string,password: string): Promise<string|null> {
  const result = await pool.query<{owner_uid:string;password_hash:string}>('select * from neurosync_auth.identity_lookup($1,$2)',['local',email.toLowerCase()]);
  const row=result.rows[0];
  const parts=(row?.password_hash ?? '').split(':');
  // Run the KDF even for an unknown user to reduce username enumeration via timing.
  const derived=await derive(password,parts[1] ?? '00000000000000000000000000000000');
  const expected=Buffer.from(parts[2] ?? '00'.repeat(64),'hex');
  return row && parts[0]==='scrypt-v1' && expected.length===derived.length && timingSafeEqual(expected,derived) ? row.owner_uid : null;
}
