import test from 'node:test';
import assert from 'node:assert/strict';
import {bundle,policy,hash,validateTag} from '../scripts/release/package.mjs';
import {Cloudflare,smoke} from '../scripts/release/cloudflare.mjs';
const sha='a'.repeat(40),binding={name:'GAME_ROOMS',type:'durable_object_namespace',class_name:'GameRoom',namespace_id:'b'.repeat(32)},runtime={compatibility_date:'2025-01-01',compatibility_flags:[],migration_tag:'v1',usage_model:'standard'};
function fake(){
 let current='old',settings={bindings:[binding]},version={resources:{script_runtime:runtime,bindings:[binding]}};const calls=[];
 const request=async(url,opts={})=>{
  const p=url.split('/scripts/'+policy.worker)[1],method=opts.method||'GET';calls.push({p,method,body:opts.body});let result;
  if(p==='/settings')result=settings;
  else if(p==='/deployments'&&method==='GET')result={deployments:[{versions:[{version_id:current,percentage:100}]}]};
  else if(p.startsWith('/versions/')&&method==='GET')result=version;
  else if(p==='/versions'&&method==='POST')result={id:'new'};
  else if(p==='/deployments'&&method==='POST'){current=JSON.parse(opts.body).versions[0].version_id;result={id:'deployment'};}
  else throw Error('Unexpected API call '+p);
  return Response.json({success:true,result});
 };
 return {cf:new Cloudflare({account:'c'.repeat(32),token:'test-token-never-log',request}),calls,setCurrent:id=>current=id,setSettings:x=>settings=x,setVersion:x=>version=x};
}
test('release: package contains exact JavaScript and text module paths; no secret in health metadata',()=>{
 const p=bundle(sha);assert.equal(p.modules.length,8);assert.equal(p.assets.length,6);
 assert.match(p.modules[0].body,/commit:'a{40}'/);assert.equal(p.modules.filter(m=>m.type==='text/plain').length,6);
 for(const m of p.modules.filter(m=>m.type==='text/plain'))assert.ok(m.body.length>0);
 assert.throws(()=>bundle('bad'),/Invalid commit/);
});
test('release: malformed tags, version mismatch and stale main cannot deploy',()=>{
 const p=bundle(sha);assert.throws(()=>validateTag('v1.8.0-beta',sha),/tag/);
 assert.throws(()=>validateTag('v99.0.0',sha),/tag/);
 assert.throws(()=>validateTag('v'+p.version,sha,()=> 'old-main'),/current release source/);
 // No completed release.json exists during development: a version number alone cannot authorize deployment.
 assert.throws(()=>validateTag('v'+p.version,sha,()=>sha,()=>({status:'draft'})),/completed/);
 assert.equal(validateTag('v'+p.version,sha,()=>sha,()=>({version:p.version,status:'complete',scope:'ui',sourceBranch:policy.sourceBranch})).sha,sha);
});
test('release: missing GitHub secrets fail without exposing credentials',()=>{
 assert.throws(()=>new Cloudflare({account:undefined,token:undefined}),/GitHub Actions cannot use/);
});
test('release: initial configuration inspection performs GET only and retains namespace',async()=>{
 const f=fake(),b=await f.cf.inspect();assert.equal(b.shape.binding.namespace_id,binding.namespace_id);assert.ok(f.calls.every(c=>c.method==='GET'));
 const m=f.cf.metadata(b,bundle(sha));assert.deepEqual(m.bindings,[binding]);assert.ok(!('migrations' in m));assert.ok(!('migration_tag' in m));assert.equal(m.compatibility_date,runtime.compatibility_date);
});
test('release: extra bindings, wrong class or unverifiable migration stop setup',async()=>{
 for(const b of [[binding,{name:'EXTRA',type:'secret_text'}],[{...binding,class_name:'Wrong'}],[{...binding,namespace_id:undefined}]]){const f=fake();f.setSettings({bindings:b});await assert.rejects(f.cf.inspect());assert.ok(f.calls.every(c=>c.method==='GET'));}
 const f=fake();f.setVersion({resources:{script_runtime:{compatibility_date:'2025-01-01'}}});await assert.rejects(f.cf.inspect(),/migration/);
});
test('release: upload contains all text modules and never activates traffic',async()=>{
 const f=fake(),b=await f.cf.inspect();assert.equal(await f.cf.upload(b,bundle(sha)),'new');
 const upload=f.calls.find(c=>c.method==='POST');assert.equal(upload.p,'/versions');assert.ok(upload.body instanceof FormData);
 for(const m of bundle(sha).modules)assert.equal(hash(Buffer.from(await upload.body.get(m.name).arrayBuffer())),hash(m.body));
 assert.ok(!f.calls.some(c=>c.method==='POST'&&c.p==='/deployments'));
});
test('release: upload refuses changed runtime or binding resources before activation',async()=>{
 const f=fake(),b=await f.cf.inspect();let n=0;
 const original=f.cf.api.bind(f.cf);f.cf.api=async(...a)=>{const r=await original(...a);if(a[0]==='/versions/new')return {resources:{script_runtime:{...runtime,migration_tag:'v2'},bindings:[binding]}};n++;return r;};
 await assert.rejects(f.cf.upload(b,bundle(sha)),/configuration differs/);assert.ok(n>0);
 assert.ok(!f.calls.some(c=>c.p==='/deployments'&&c.method==='POST'));
});
test('release: failed smoke rolls back only our deployment with unchanged configuration',async()=>{
 const f=fake(),baseline=await f.cf.inspect();f.setCurrent('new');const r=await f.cf.rollback({baseline,candidate:'new'});assert.equal(r.status,'ROLLED_BACK');assert.equal(await f.cf.active(),'old');
});
test('release: concurrent deployment and namespace drift prohibit unsafe rollback',async()=>{
 const f=fake(),baseline=await f.cf.inspect();f.setCurrent('someone-else');await assert.rejects(f.cf.rollback({baseline,candidate:'new'}),/Concurrent/);
 f.setCurrent('new');f.setSettings({bindings:[{...binding,namespace_id:'different'}]});await assert.rejects(f.cf.rollback({baseline,candidate:'new'}),/Configuration/);
 assert.ok(!f.calls.some(c=>c.p==='/deployments'&&c.method==='POST'));
});
test('release: Cloudflare errors redact response bodies and token',async()=>{
 const cf=new Cloudflare({account:'c'.repeat(32),token:'sensitive',request:async()=>Response.json({success:false,errors:[{code:10000,message:'sensitive'}]},{status:403})});
 await assert.rejects(cf.inspect(),e=>/HTTP 403/.test(e.message)&&!e.message.includes('sensitive'));
});
test('release: production smoke validates version, commit and exact frontend asset hashes',async()=>{
 const p=bundle(sha);const {read}=await import('../scripts/release/package.mjs');
 const request=async url=>{const path=new URL(url).pathname;return path==='/api/health'?Response.json({ok:true,service:policy.worker,version:p.version,commit:sha}):new Response(read('public/'+(path==='/'?'index.html':path.slice(1))));};
 const result=await smoke(p,{request});assert.equal(result.resources.length,6);
 await assert.rejects(smoke({...p,sha:'b'.repeat(40)},{request}));
 await assert.rejects(smoke({...p,assets:[{path:'/app.js',sha256:'wrong'}]},{request}),/Asset integrity/);
});
