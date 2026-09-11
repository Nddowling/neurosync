import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {createPool} from '../server/db/pool.js';
// Offline operator action. The web runtime has no profile/identity provisioning authority.
const email=z.string().email().max(320).parse(process.argv[2]).trim().toLowerCase();
const pool=createPool(process.env.MIGRATION_DATABASE_URL??'');
const client=await pool.connect();
try{
 await client.query('begin');
 if((await client.query("select current_user='app_rw' as runtime")).rows[0].runtime)throw new Error('Provisioning requires an offline migration role');
 const uid=randomUUID();
 await client.query('insert into neurosync.clinicians(uid,email) values($1,$2)',[uid,email]);
 await client.query("insert into neurosync_auth.identities(provider,external_subject,owner_uid) values('supabase-email',$1,$2)",[email,uid]);
 await client.query('commit');console.log('Clinician invitation eligibility created. No email was sent.');
}catch(error){await client.query('rollback');throw error;}finally{client.release();await pool.end();}
