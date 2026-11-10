import test from 'node:test';
import assert from 'node:assert/strict';
import {view} from '../src/engine.mjs';
import {fixture,bribeFixture} from './helpers/fixtures.mjs';

// Same tests against real Node HTTP/SSE and the Worker router + cloned DO storage.
import {transport} from './helpers/transport.mjs';

const statePath=(g,i)=>`/api/state?code=${g.code}&token=${g.players[i].token}`;
const eventsPath=(g,i)=>`/api/events?code=${g.code}&token=${g.players[i].token}`;
async function post(tr,i,command){return tr.request('/api/command',{code:tr.game.code,token:tr.game.players[i].token,command});}
async function event(response){assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);const reader=response.body.getReader();const first=await reader.read();return {state:JSON.parse(new TextDecoder().decode(first.value).slice(6).trim()),reader};}
function privacy(v,g,seat){
 const serialized=JSON.stringify(v);for(const p of g.players)assert.ok(!serialized.includes(p.token),'session token in response');
 assert.deepEqual(v.myCards.map(c=>c.type),g.players[seat].cards.map(c=>c.type));
 for(const [i,p] of v.players.entries())for(const [j,c] of p.cards.entries())assert.equal(c.type,g.players[i].cards[j].revealed?g.players[i].cards[j].type:null);
 if(g.pending?.kind==='bribe'&&seat!==g.pending.owner){assert.deepEqual(v.pending,{kind:'bribe',owner:g.pending.owner});assert.ok(!serialized.includes(g.pending.decisionId));assert.ok(!serialized.includes(g.pending.cardId));}
}
for(const kind of ['local','worker']){
 test(`${kind}: Bribe hidden information is private in command, GET, live SSE, reconnect, and invalid errors`,async t=>{
  const seed=fixture();seed.players[0].hand=['bribe'];const tr=await transport(kind,t,seed);const stream=await event(await tr.request(eventsPath(seed,3)));privacy(stream.state,tr.game,3);
  const response=await post(tr,0,{type:'playEquipment',target:1,slot:2});assert.equal(response.status,200);const own=(await response.json()).state;privacy(own,tr.game,0);assert.equal(Object.keys(own.known).length,1);
  const update=await stream.reader.read();const observer=JSON.parse(new TextDecoder().decode(update.value).slice(6).trim());privacy(observer,tr.game,3);assert.deepEqual(observer.known,{});assert.deepEqual(observer.privateLog,[]);
  await stream.reader.cancel();
  for(let i=0;i<4;i++){const r=await tr.request(statePath(tr.game,i));assert.equal(r.status,200);const v=await r.json();privacy(v,tr.game,i);if(i)assert.deepEqual(v.known,{});}
  const reconnected=await event(await tr.request(eventsPath(tr.game,3)));privacy(reconnected.state,tr.game,3);await reconnected.reader.cancel();
  const before=structuredClone(tr.game);const stolen=await post(tr,3,{type:'resolveBribe',decisionId:own.pending.decisionId,swap:true,ownSlot:0});assert.equal(stolen.status,400);assert.deepEqual(await stolen.json(),{error:'Lựa chọn Tiền Bẩn không hợp lệ.'});assert.deepEqual(tr.game,before);
  for(const endpoint of ['state','events']){const invalid=await tr.request(`/api/${endpoint}?code=${seed.code}&token=BAD`);assert.equal(invalid.status,400);const body=await invalid.json();assert.deepEqual(Object.keys(body),['error']);}
  const done=await post(tr,0,{type:'resolveBribe',decisionId:own.pending.decisionId,swap:false});assert.equal(done.status,200);
 });
 test(`${kind}: Wire private result reaches only authorized owner/investigator over HTTP and SSE`,async t=>{
  const g=fixture();g.players[0].hand=['wire'];const tr=await transport(kind,t,g);
  assert.equal((await post(tr,0,{type:'playEquipment',target:1})).status,200);
  // It remains the same API flow: A investigates and ends turn to B.
  await post(tr,0,{type:'actionInvestigate',target:3,slot:0});await post(tr,0,{type:'endTurn'});
  const owner=await event(await tr.request(eventsPath(g,0)));const observer=await event(await tr.request(eventsPath(g,3)));
  assert.equal((await post(tr,1,{type:'actionInvestigate',target:2,slot:2})).status,200);
  // V1.9 queues an owner-selected Wire investigation instead of mirroring the watched slot immediately.
  assert.equal(tr.game.pending?.kind,'investigation-reaction');assert.equal(tr.game.pending.owner,0);
  const read=async reader=>JSON.parse(new TextDecoder().decode((await reader.read()).value).slice(6).trim());
  const pendingOwner=await read(owner.reader),pendingOther=await read(observer.reader);
  assert.equal(pendingOwner.known[`${tr.game.players[2].id}:2`],undefined);
  assert.equal(pendingOther.known[`${tr.game.players[2].id}:2`],undefined);
  assert.equal((await post(tr,0,{type:'resolveInvestigationReaction',slot:2})).status,200);
  const ownerUpdate=await read(owner.reader),otherUpdate=await read(observer.reader);const key=`${tr.game.players[2].id}:2`;
  assert.equal(ownerUpdate.known[key].type,tr.game.players[2].cards[2].type);assert.equal(otherUpdate.known[key],undefined);assert.deepEqual(otherUpdate.privateLog,[]);privacy(ownerUpdate,tr.game,0);privacy(otherUpdate,tr.game,3);await owner.reader.cancel();await observer.reader.cancel();
 });
 test(`${kind}: expired disconnected Bribe resumes before reconnect and rejects stale swap without refund`,async t=>{
  const g=bribeFixture(),id=g.pending.decisionId;g.pending.deadline=Date.now()-1;const cards=structuredClone(g.players.map(p=>p.cards));const tr=await transport(kind,t,g);
  const late=await post(tr,0,{type:'resolveBribe',decisionId:id,swap:true,ownSlot:0});assert.equal(late.status,400);assert.equal(tr.game.pending,null);assert.deepEqual(tr.game.players.map(p=>p.cards),cards);assert.deepEqual(tr.game.players[0].hand,[]);
  const r=await post(tr,0,{type:'actionInvestigate',target:2,slot:1});assert.equal(r.status,200);const fresh=await event(await tr.request(eventsPath(tr.game,0)));assert.equal(fresh.state.pending,null);await fresh.reader.cancel();
 });
}

test('Worker restart keeps original deadline; alarm expires disconnected human and persists before rejection',async t=>{
 const g=bribeFixture(),deadline=g.pending.deadline,known=structuredClone(g.players[0].known);const tr=await transport('worker',t,g);
 // Reconnect schedules unchanged saved deadline, even after a fresh object instance.
 await post(tr,0,{type:'chat',message:'reconnect'});assert.equal(tr.alarmAt,deadline);tr.restart();assert.equal((await (await tr.request(statePath(g,0))).json()).pending.deadline,deadline);
 t.mock.timers.enable({apis:['Date'],now:deadline});await tr.alarm();assert.equal(tr.game.pending,null);assert.deepEqual(tr.game.players[0].known,known);assert.equal(tr.alarmAt,tr.game.createdAt+24*60*60*1000);
 tr.restart();assert.equal((await (await tr.request(statePath(g,0))).json()).pending,null);
});
test('Worker duplicate concurrent Bribe decisions and an alarm cannot apply a stale swap twice',async t=>{
 const g=bribeFixture(),id=g.pending.decisionId;const tr=await transport('worker',t,g);
 const command={type:'resolveBribe',decisionId:id,swap:true,ownSlot:0};const responses=await Promise.all([post(tr,0,command),post(tr,0,command),tr.alarm()]);assert.deepEqual(responses.slice(0,2).map(r=>r.status).sort(),[200,400]);assert.equal(tr.game.pending,null);assert.equal(tr.game.discard.filter(x=>x==='bribe').length,1);
});

test('local timer resolves abandoned Bribe with zero clients and zero incoming requests',async t=>{
 const g=bribeFixture();g.pending.deadline=Date.now()+10;const cards=structuredClone(g.players.map(p=>p.cards));const tr=await transport('local',t,g);
 await new Promise(resolve=>setTimeout(resolve,1500));
 assert.equal(tr.game.pending,null);assert.deepEqual(tr.game.players.map(p=>p.cards),cards);assert.deepEqual(tr.game.players[0].hand,[]);assert.equal(tr.game.log.filter(x=>x.msg.includes('hết thời gian Tiền Bẩn')).length,1);
});
for(const kind of ['local','worker'])test(`${kind}: ordinary/leader target cannot be probed through legacy errors or unrelated observers`,async t=>{
 const seed=fixture();seed.players[0].hand=['bribe'];t.mock.timers.enable({apis:['Date'],now:Date.now()});
 const errors=[],outsiderSnapshots=[];
 for(const type of ['honest','agent','kingpin']){
  const g=structuredClone(seed);g.players[1].cards[2].type=type;const tr=await transport(kind,t,g);const before=structuredClone(tr.game);
  const r=await post(tr,0,{type:'playEquipment',target:1,slot:2,ownSlot:0});assert.equal(r.status,400);errors.push(await r.json());assert.deepEqual(tr.game,before);
  const played=await post(tr,0,{type:'playEquipment',target:1,slot:2});assert.equal(played.status,200);
  const out=await tr.request(statePath(g,3));outsiderSnapshots.push(await out.json());
 }
 assert.deepEqual(errors[0],errors[1]);assert.deepEqual(errors[1],errors[2]);assert.deepEqual(outsiderSnapshots[0],outsiderSnapshots[1]);assert.deepEqual(outsiderSnapshots[1],outsiderSnapshots[2]);
});
