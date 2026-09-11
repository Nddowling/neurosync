import {test} from 'node:test';
import assert from 'node:assert/strict';
import {HttpProvider} from '../server/ai/providers/http.js';
import {billingContext} from '../server/ai/schemas.js';
import {LexicalEmbedding,cosine} from '../server/ai/embeddings.js';
test('billing context preserves crisis and combined documentation branches',()=>{
 assert.equal(billingContext(['90839']),'crisis');assert.equal(billingContext(['90840','99213','90833']),'crisis');
 assert.equal(billingContext(['99213','90833']),'combined');assert.equal(billingContext(['99214']),'evaluation');assert.equal(billingContext(['90837']),'psychotherapy');assert.equal(billingContext([]),'general');
});
for(const provider of ['openai','anthropic','google'] as const)test(`${provider} adapter owns credentials, model routing and structured output request`,async()=>{
 const transport:typeof fetch=async(url,init)=>{
  assert.ok(String(url).startsWith('https://'));assert.equal(init?.method,'POST');assert.ok(init?.signal);
  const body=JSON.parse(String(init?.body));assert.ok(JSON.stringify(body).includes('synthetic-model')||String(url).includes('synthetic-model'));
  const headers=new Headers(init?.headers);assert.equal(headers.get(provider==='openai'?'authorization':provider==='anthropic'?'x-api-key':'x-goog-api-key'),provider==='openai'?'Bearer synthetic-key':'synthetic-key');
  return Response.json(provider==='openai'?{choices:[{message:{content:'{"ok":true}'}}]}:provider==='anthropic'?{content:[{type:'text',text:'{"ok":true}'}]}:{candidates:[{content:{parts:[{text:'{"ok":true}'}]}}]});
 };
 assert.equal(await new HttpProvider(provider,'synthetic-model','synthetic-key',transport).generate({system:'Owned prompt',input:'Synthetic facts',structured:true}),'{"ok":true}');
});
test('provider failures do not expose upstream payloads',async()=>{
 const provider=new HttpProvider('openai','synthetic-model','synthetic-key',async()=>new Response('SENSITIVE_UPSTREAM_BODY',{status:500}));
 await assert.rejects(provider.generate({system:'prompt',input:'synthetic',structured:false}),{status:503,code:'service_unavailable'});
});
test('local lexical embeddings are deterministic and have unit norm',async()=>{
 const provider=new LexicalEmbedding();const vector=await provider.embed('sleep monitoring protocol');assert.deepEqual(vector,await provider.embed('sleep monitoring protocol'));
 assert.ok(Math.abs(cosine(vector,vector)-1)<0.00001);assert.equal(cosine(vector,[]),0);
});

test('GPT-5 mini uses low reasoning with a bounded completion and no stored provider response',async()=>{
 const transport:typeof fetch=async(_url,init)=>{
  const body=JSON.parse(String(init?.body));
  assert.equal(body.model,'gpt-5-mini');assert.equal(body.reasoning_effort,'low');
  assert.equal(body.max_completion_tokens,8192);assert.equal(body.store,false);
  assert.deepEqual(body.response_format,{type:'json_object'});
  assert.equal(body.temperature,undefined);
  return Response.json({choices:[{message:{content:'{"ok":true}'}}]});
 };
 assert.equal(await new HttpProvider('openai','gpt-5-mini','synthetic-key',transport).generate({system:'Owned prompt',input:'Synthetic facts',structured:true}),'{"ok":true}');
});
