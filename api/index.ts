import {application} from '../server/application.js';
import {createPool,assertRuntimeRole} from '../server/db/pool.js';
import {authConfig} from '../server/config.js';
const pool=createPool(process.env.DATABASE_URL??'');
pool.on('error',()=>console.error('Database pool unavailable'));
const app=application(pool,authConfig(process.env));
let ready:Promise<void>|undefined;
export default {async fetch(request:Request):Promise<Response>{
 try {
  ready??=(async()=>{const client=await pool.connect();try{await assertRuntimeRole(client);}finally{client.release();}})().catch(error=>{ready=undefined;throw error;});
  await ready;return await app(request);
 }catch(error){console.error('runtime_initialization_failed',{code:typeof error==='object'&&error!==null&&'code' in error?String(error.code):'configuration'});return Response.json({error:'service_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}};
