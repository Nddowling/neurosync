import {createHash} from 'node:crypto';
import type {Pool} from 'pg';
import type {Identity} from '../auth/identity.js';
import {withIdentity} from '../db/transaction.js';
/** Replaceable vector boundary. Default is a local lexical embedding, not a learned semantic model. */
export interface EmbeddingProvider {readonly model:string;embed(text:string):Promise<number[]>}
export class LexicalEmbedding implements EmbeddingProvider {
 readonly model='neurosync-token-hash-v1';
 async embed(text:string){
  const vector=Array<number>(256).fill(0);
  for(const word of text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)??[]){
   if(['the','and','for','with','this','that','from','have','has','are','was','were','not'].includes(word))continue;
   const hash=createHash('sha256').update(word).digest();const index=hash[0]!;vector[index]=vector[index]!+(hash[1]!%2?1:-1);
  }
  const norm=Math.sqrt(vector.reduce((sum,v)=>sum+v*v,0));return norm?vector.map(v=>v/norm):vector;
 }
}
export function cosine(a:number[],b:number[]){if(a.length!==b.length)return 0;return a.reduce((sum,v,i)=>sum+v*b[i]!,0);}
export class Embeddings {
 constructor(private pool:Pool,readonly provider:EmbeddingProvider=new LexicalEmbedding()){}
 async index(identity:Identity,knowledgeId:string){
  // Content hash comparison prevents a slow indexing request overwriting a newer revision.
  const chunks=await withIdentity(this.pool,identity,async client=>(await client.query('select id,content from neurosync.knowledge_chunks where knowledge_id=$1 and owner_uid=$2',[knowledgeId,identity.subject])).rows);
  const vectors=await Promise.all(chunks.map(async chunk=>({...chunk,vector:await this.provider.embed(chunk.content)})));
  await withIdentity(this.pool,identity,async client=>{
   for(let start=0;start<vectors.length;start+=100){
    const batch=vectors.slice(start,start+100).map(row=>({id:row.id,content:row.content,embedding:row.vector}));
    await client.query(`update neurosync.knowledge_chunks c set embedding=v.embedding,embedding_model=$2 from jsonb_to_recordset($1::jsonb) as v(id uuid,content text,embedding double precision[]) where c.id=v.id and c.owner_uid=$3 and c.content=v.content`,[JSON.stringify(batch),this.provider.model,identity.subject]);
   }
  });
 }
}
