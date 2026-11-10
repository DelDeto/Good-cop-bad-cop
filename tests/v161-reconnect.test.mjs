import test from 'node:test';
import assert from 'node:assert/strict';
import {transport} from './helpers/transport.mjs';
import {board,act,beginShot,redirect} from './helpers/turns.mjs';
const statePath=g=>`/api/state?code=${g.code}&token=${g.players[2].token}`;
const post=(tr,i,command)=>tr.request('/api/command',{code:tr.game.code,token:tr.game.players[i].token,command});
async function reconnect(tr){const g=tr.game,r=await tr.request(`/api/events?code=${g.code}&token=${g.players[2].token}`);assert.equal(r.status,200);const reader=r.body.getReader(),value=await reader.read();const state=JSON.parse(new TextDecoder().decode(value.value).slice(6).trim());await reader.cancel();return state;}
for(const n of [4,8])for(const kind of ['local','worker'])for(const scenario of ['redirect','coffee'])test(`${kind}: ${scenario} shot reconnect preserves pending and transitions safely (${n})`,async t=>{
 const g=board(n);if(scenario==='coffee'){g.players[1].hand=['coffee'];act(g,1,{type:'playEquipment'});}beginShot(g);if(scenario==='redirect')redirect(g);
 const tr=await transport(kind,t,g),pending=structuredClone(g.pending);const before=await reconnect(tr);assert.deepEqual(before.pending.passes,pending.passes);assert.equal(before.pending.since,pending.since);assert.equal(before.coffeeNext,g.coffeeNext);
 if(kind==='worker')tr.restart();const again=await reconnect(tr);assert.deepEqual(again,before);assert.deepEqual(tr.game.pending,pending);
 for(let i=1;i<n;i++){const r=await post(tr,i,{type:'passShot'});assert.equal(r.status,200);}
 if(scenario==='coffee'){assert.equal(tr.game.coffeeNext,null);assert.equal((await post(tr,0,{type:'endTurn'})).status,200);}
 const fresh=await reconnect(tr);assert.equal(fresh.pending,null);assert.equal(fresh.turn,scenario==='coffee'?2:1);assert.equal(fresh.round,2);assert.equal(fresh.status,'playing');assert.ok(fresh.players[fresh.turn].alive);
 for(const [i,p] of fresh.players.entries())for(const [j,c] of p.cards.entries())assert.equal(c.type,tr.game.players[i].cards[j].revealed?tr.game.players[i].cards[j].type:null);
 assert.deepEqual(fresh.known,{});assert.deepEqual(fresh.privateLog,[]);for(const p of tr.game.players)assert.ok(!JSON.stringify(fresh).includes(p.token));
 if(kind==='worker')tr.restart();assert.deepEqual(await (await tr.request(statePath(tr.game))).json(),fresh);
});
test('Worker alarm resolves redirected shot killing BOT shooter and schedules a living BOT next',async t=>{
 const g=board(8);beginShot(g);redirect(g);g.players.forEach(p=>p.bot=true);const deadline=g.pending.since+20000;const tr=await transport('worker',t,g);
 t.mock.timers.enable({apis:['Date'],now:deadline});await tr.alarm();assert.equal(tr.game.players[0].alive,false);assert.equal(tr.game.turn,1);assert.equal(tr.game.phase,'action');assert.ok(tr.alarmAt>Date.now());
 tr.restart();await tr.alarm();assert.ok(tr.game.players[tr.game.turn].alive);assert.notEqual(tr.game.phase,'action');
});
test('Fourth-edition Serum reveals selected card immediately and persists across Worker restart',async t=>{
 const g=board(4);g.players[0].hand=['serum'];act(g,0,{type:'playEquipment',target:1,slot:2});
 assert.equal(g.pending,null);assert.equal(g.players[1].cards[2].revealed,true);assert.ok(g.players[1].cards.slice(0,2).every(c=>!c.revealed));
 const tr=await transport('worker',t,g),before=await reconnect(tr);tr.restart();assert.deepEqual(await reconnect(tr),before);
 await tr.alarm();assert.equal(tr.game.pending,null);assert.equal(tr.game.players[1].cards[2].revealed,true);
 assert.equal((await post(tr,1,{type:'serumReveal',slot:0})).status,400);
});
for(const kind of ['local','worker'])test(`${kind}: reconnect repairs an old dead active seat exactly once without interrupting pending choices`,async t=>{
 const g=board(4);g.players[0].alive=false;g.phase='aim';g.coffeeNext=0;const tr=await transport(kind,t,g);
 const restored=await reconnect(tr);assert.equal(restored.turn,1);assert.equal(restored.round,2);assert.equal(restored.phase,'action');assert.equal(restored.coffeeNext,null);assert.deepEqual(await reconnect(tr),restored);
});
