import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const port=process.env.SMOKE_PORT||'18787',base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('../',import.meta.url),env:{...process.env,PORT:port},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{child.stdout.once('data',resolve);child.once('error',reject);child.once('exit',code=>reject(Error(`Server exited ${code}`)));});
 const post=async(route,data)=>{const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});assert.equal(r.status,200);return r.json();};
 const page=await fetch(base+'/');assert.match(await page.text(),/Điệp Viên Số Dách/);
 const owner=await post('/api/create',{name:'Smoke host'});const users=[owner];for(const name of ['B','C','D'])users.push(await post('/api/join',{code:owner.code,name}));
 await post('/api/command',{...owner,command:{type:'start'}});
 const state=async user=>{const r=await fetch(base+`/api/state?code=${owner.code}&token=${user.token}`);assert.equal(r.status,200);return r.json();};
 const own=await state(owner);assert.equal(own.myCards.length,3);assert.ok(own.players[1].cards.every(c=>c.type===null));
 const investigated=await post('/api/command',{...owner,command:{type:'actionInvestigate',target:1,slot:2}});assert.equal(Object.keys(investigated.state.known).length,1);assert.deepEqual((await state(users[2])).known,{});
 for(let repeat=0;repeat<2;repeat++){
  const events=await fetch(base+`/api/events?code=${owner.code}&token=${owner.token}`,{signal:AbortSignal.timeout(3000)});assert.match(events.headers.get('content-type'),/text\/event-stream/);const reader=events.body.getReader();const {value}=await reader.read();const snapshot=JSON.parse(new TextDecoder().decode(value).slice(6).trim());assert.deepEqual(snapshot.known,investigated.state.known);await reader.cancel();
 }
 assert.equal((await fetch(base+`/api/state?code=${owner.code}&token=invalid`)).status,400);
 console.log('PASS: actual server.mjs homepage, four-human room, investigation privacy, SSE reconnect, invalid token');
}finally{child.kill('SIGTERM');}
