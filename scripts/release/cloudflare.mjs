import assert from 'node:assert/strict';
import {hash,policy} from './package.mjs';
const canonical=x=>JSON.stringify(x,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
export class Cloudflare {
 constructor({account,token,request=fetch}){
  if(!/^[a-f0-9]{32}$/.test(account||'')||!token)throw Error('GitHub Actions cannot use CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN; check repository Secrets and Actions permissions');
  this.path=`https://api.cloudflare.com/client/v4/accounts/${account}/workers/scripts/${policy.worker}`;this.token=token;this.request=request;
 }
 async api(path='',method='GET',body){
  const r=await this.request(this.path+path,{method,headers:{Authorization:`Bearer ${this.token}`,...(body instanceof FormData?{}:{'Content-Type':'application/json'})},body:body instanceof FormData?body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const json=await r.json().catch(()=>({}));
  if(!r.ok||json.success!==true)throw Error(`Cloudflare ${method} ${path||'/'} failed HTTP ${r.status}; codes ${(json.errors||[]).map(e=>e.code).join(',')} (credentials/response bodies redacted)`);
  return json.result;
 }
 async active(){
  const list=await this.api('/deployments'),d=list.deployments?.[0];
  if(d?.versions?.length!==1||d.versions[0].percentage!==100)throw Error('Missing single 100% active version; refusing to override a split rollout');
  return d.versions[0].version_id;
 }
 async inspect(){
  const settings=await this.api('/settings'),id=await this.active(),v=await this.api('/versions/'+id);
  const bindings=settings.bindings;
  if(!Array.isArray(bindings)||bindings.length!==1)throw Error('Review required: expected only existing GAME_ROOMS binding; additional bindings are never silently discarded');
  const b=bindings[0];
  if(b.name!=='GAME_ROOMS'||b.type!=='durable_object_namespace'||b.class_name!=='GameRoom'||!b.namespace_id||b.script_name&&b.script_name!==policy.worker)throw Error('Existing GAME_ROOMS / GameRoom namespace mismatch');
  const runtime=v.resources?.script_runtime;
  if(!runtime?.compatibility_date||!runtime.migration_tag)throw Error('Cannot verify existing compatibility date / migration tag');
  // Preserve all runtime fields supported by version upload. Refuse future settings we cannot preserve.
  if(runtime.exports||runtime.limits)throw Error('Runtime exports/limits require explicit deployment compatibility review');
  const shape={binding:{name:b.name,type:b.type,class_name:b.class_name,namespace_id:b.namespace_id,...(b.script_name?{script_name:b.script_name}:{})},runtime:{compatibility_date:runtime.compatibility_date,compatibility_flags:runtime.compatibility_flags||[],usage_model:runtime.usage_model,migration_tag:runtime.migration_tag}};
  return {id,shape,fingerprint:hash(canonical(shape))};
 }
 metadata(before,pkg){
  const {migration_tag,...runtime}=before.shape.runtime;
  return {main_module:'worker.mjs',...runtime,bindings:[before.shape.binding],annotations:{'workers/message':`UI ${pkg.version} ${pkg.sha}`,'workers/tag':`v${pkg.version}`}};
 }
 async upload(before,pkg){
  const form=new FormData();form.set('metadata',new Blob([JSON.stringify(this.metadata(before,pkg))],{type:'application/json'}));
  for(const m of pkg.modules)form.set(m.name,new Blob([m.body],{type:m.type}),m.name);
  const uploaded=await this.api('/versions','POST',form);
  if(!uploaded.id)throw Error('Missing uploaded version ID');
  const v=await this.api('/versions/'+uploaded.id);
  if(canonical(v.resources?.script_runtime)!==canonical((await this.api('/versions/'+before.id)).resources?.script_runtime)||canonical(v.resources?.bindings)!==canonical((await this.api('/versions/'+before.id)).resources?.bindings))throw Error('Uploaded version configuration differs from active version; traffic unchanged');
  return uploaded.id;
 }
 async activate(id){return this.api('/deployments','POST',{strategy:'percentage',versions:[{version_id:id,percentage:100}]});}
 async rollback(record){
  const current=await this.inspect();
  if(current.id===record.baseline.id)return {status:'UNCHANGED'};
  assert.equal(current.id,record.candidate,'Concurrent deployment detected; automatic rollback refused');
  assert.equal(current.fingerprint,record.baseline.fingerprint,'Configuration changed; automatic rollback refused');
  const v=await this.api('/versions/'+record.baseline.id),cur=await this.api('/versions/'+record.candidate);
  assert.deepEqual(v.resources?.script_runtime,cur.resources?.script_runtime,'Runtime changed');
  assert.deepEqual(v.resources?.bindings,cur.resources?.bindings,'Bindings changed');
  await this.activate(record.baseline.id);
  assert.equal(await this.active(),record.baseline.id);
  return {status:'ROLLED_BACK',version:record.baseline.id};
 }
}
export async function smoke(pkg,{request=fetch,baseline=false}={}){
 const get=async path=>{const r=await request(policy.url+path+(path.includes('?')?'&':'?')+'release-smoke='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(15000)});assert.equal(r.status,200,`HTTP ${path}`);return r;};
 const health=await (await get('/api/health')).json();assert.equal(health.ok,true);assert.equal(health.service,policy.worker);
 if(!baseline){assert.equal(health.version,pkg.version);assert.equal(health.commit,pkg.sha);}
 const resources=[];
 for(const a of pkg.assets){const r=await get(a.path);const digest=hash(Buffer.from(await r.arrayBuffer()));if(!baseline)assert.equal(digest,a.sha256,`Asset integrity ${a.path}`);resources.push({path:a.path,sha256:digest});}
 return {health,resources};
}
