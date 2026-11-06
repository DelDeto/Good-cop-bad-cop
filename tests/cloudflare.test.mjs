import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function loadWorker(){
  let source=fs.readFileSync(path.join(root,'worker.mjs'),'utf8');
  const engine=fs.readFileSync(path.join(root,'src/engine.mjs'),'utf8');
  const dataURI=`data:text/javascript;base64,${Buffer.from(engine).toString('base64')}`;
  source=source.replace("from './src/engine.mjs'",`from '${dataURI}'`);
  for(const [name,identifier] of [['assets/index.txt','html'],['assets/app.txt','appJS'],['assets/style.txt','styles'],['assets/favicon.txt','favicon'],['assets/table-b64.txt','tableB64'],['assets/item-art-b64.txt','itemArtB64']]){
    source=source.replace(`import ${identifier} from './${name}';`,`const ${identifier} = ${JSON.stringify(fs.readFileSync(path.join(root,name),'utf8'))};`);
  }
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
function fakeEnvironment(GameRoom){
  const rooms=new Map();
  return {__rooms:rooms,GAME_ROOMS:{idFromName:n=>n,get(name){
    if(!rooms.has(name)){
      const values=new Map();const ctx={storage:{get:async k=>values.get(k),put:async(k,v)=>values.set(k,structuredClone(v)),setAlarm:async()=>{},deleteAll:async()=>values.clear()}};
      rooms.set(name,new GameRoom(ctx,{}));
    }
    return {fetch:r=>rooms.get(name).fetch(r)};
  }}};
}
const request=(path,body)=>new Request('https://test.local'+path,body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:undefined);
test('Cloudflare Worker: homepage, create, join, play and player privacy',async()=>{
  const {default:worker,GameRoom}=await loadWorker();const env=fakeEnvironment(GameRoom);
  const health=await worker.fetch(request('/api/health'),env);assert.equal(health.status,200);assert.equal((await health.json()).ok,true);
  const html=await worker.fetch(request('/'),env);assert.equal(html.status,200);assert.match(await html.text(),/Điệp Viên Số Dách/);
  const created=await (await worker.fetch(request('/api/create',{name:'A'}),env)).json();assert.match(created.code,/^[A-F0-9]{6}$/);
  const all=[created];for(const n of ['B','C','D']){
    const r=await worker.fetch(request('/api/join',{code:created.code,name:n}),env);assert.equal(r.status,200);all.push(await r.json());
  }
  const url=`/api/state?code=${created.code}&token=${created.token}`;
  const before=await (await worker.fetch(request(url),env)).json();assert.equal(before.players.length,4);
  assert.equal((await worker.fetch(request('/api/command',{code:created.code,token:created.token,command:{type:'start'}}),env)).status,200);
  const own=await (await worker.fetch(request(url),env)).json();
  assert.equal(own.myCards.length,3);assert.equal(own.status,'playing');
  assert.equal(own.players[1].cards.every(c=>c.type===null),true);
  const wrong=await worker.fetch(request('/api/command',{code:created.code,token:all[1].token,command:{type:'actionArm'}}),env);
  assert.equal(wrong.status,400);
  const investigate=await worker.fetch(request('/api/command',{code:created.code,token:created.token,command:{type:'actionInvestigate',target:1,slot:0}}),env);
  assert.equal(investigate.status,200);
  const stateB=await (await worker.fetch(request(`/api/state?code=${created.code}&token=${all[1].token}`),env)).json();
  assert.equal(Object.keys(stateB.known).length,0);
  assert.equal(stateB.players[1].cards[0].type,null);
});

test('Cloudflare Durable Object schedules bot turns and alarm advances the room',async()=>{
 const {default:worker,GameRoom}=await loadWorker();const env=fakeEnvironment(GameRoom);
 const created=await (await worker.fetch(request('/api/create',{name:'Người chơi'}),env)).json();
 const {code,token}=created;
 let r=await worker.fetch(request('/api/command',{code,token,command:{type:'setBots',count:3,level:'normal'}}),env);
 assert.equal(r.status,200);
 r=await worker.fetch(request('/api/command',{code,token,command:{type:'start'}}),env);
 assert.equal(r.status,200);
 const game=env.__rooms.get(code);
 // Human investigates, ends turn, bot must operate on the server during a Durable Object alarm.
 r=await worker.fetch(request('/api/command',{code,token,command:{type:'actionInvestigate',target:1,slot:0}}),env);
 assert.equal(r.status,200);
 r=await worker.fetch(request('/api/command',{code,token,command:{type:'endTurn'}}),env);
 assert.equal(r.status,200);
 const before=await (await worker.fetch(request(`/api/state?code=${code}&token=${token}`),env)).json();
 assert.equal(before.turn,1);
 await game.alarm();
 const after=await (await worker.fetch(request(`/api/state?code=${code}&token=${token}`),env)).json();
 assert.notDeepEqual(after.log,before.log);
 assert.equal(after.players[1].bot,true);
 assert.ok(after.players[1].cards.every(x=>x.type===null));
});
