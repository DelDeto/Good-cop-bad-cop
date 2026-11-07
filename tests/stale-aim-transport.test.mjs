import test from 'node:test';
import assert from 'node:assert/strict';
import {transport} from './helpers/transport.mjs';
import {board,beginShot} from './helpers/turns.mjs';
for(const kind of ['local','worker'])test(`${kind}: elimination broadcasts cleared aim, reconnect persists it and dead shot is rejected`,async t=>{
 const g=board(4);g.players[2].gun=true;g.players[2].aim=1;beginShot(g);const tr=await transport(kind,t,g);
 const events=await tr.request(`/api/events?code=${g.code}&token=${g.players[2].token}`),reader=events.body.getReader();
 const read=async()=>JSON.parse(new TextDecoder().decode((await reader.read()).value).slice(6).trim());
 assert.equal((await read()).players[2].aim,1);
 const post=(i,command)=>tr.request('/api/command',{code:g.code,token:g.players[i].token,command});
 let state;for(let i=1;i<4;i++){assert.equal((await post(i,{type:'passShot'})).status,200);state=await read();}
 assert.equal(state.pending,null);assert.equal(state.players[1].alive,false);assert.equal(state.players[2].aim,null);assert.deepEqual(state.known,{});assert.deepEqual(state.privateLog,[]);assert.ok(state.players[3].cards.every(c=>c.type===null));await reader.cancel();
 if(kind==='worker')tr.restart();assert.equal((await (await tr.request(`/api/state?code=${g.code}&token=${g.players[2].token}`)).json()).players[2].aim,null);
 assert.equal((await post(0,{type:'endTurn'})).status,200);assert.equal(tr.game.turn,2);
 assert.equal((await post(2,{type:'actionShoot'})).status,400);assert.equal(tr.game.pending,null);
 assert.equal((await post(2,{type:'actionInvestigate',target:3,slot:0})).status,200);
 assert.equal((await post(2,{type:'chooseAim',target:0})).status,200);assert.equal((await post(2,{type:'endTurn'})).status,200);assert.ok(tr.game.players[tr.game.turn].alive);
});
