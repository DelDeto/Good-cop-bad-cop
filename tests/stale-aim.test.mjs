import test from 'node:test';
import assert from 'node:assert/strict';
import {botStep,resolveTimedPending,view} from '../src/engine.mjs';
import {board,act,beginShot,settle} from './helpers/turns.mjs';
for(const n of [4,8])for(const bots of [false,true])test(`elimination invalidates every surviving gun aimed at victim; re-aim progresses (${n}, ${bots?'BOT':'human'})`,()=>{
 const g=board(n);for(let i=2;i<n;i++){g.players[i].gun=true;g.players[i].aim=1;}
 beginShot(g);settle(g);assert.equal(g.players[1].alive,false);
 for(let i=2;i<n;i++){assert.ok(g.players[i].gun);assert.equal(g.players[i].aim,null);}
 act(g,0,{type:'endTurn'});assert.equal(g.turn,2);assert.equal(g.phase,'action');
 if(bots){g.players[2].bot=true;assert.ok(botStep(g));assert.ok(botStep(g));assert.ok(g.players[g.players[2].aim].alive);assert.ok(botStep(g));assert.notEqual(g.turn,2);}
 else{const before=structuredClone(g);assert.throws(()=>act(g,2,{type:'actionShoot'}));assert.deepEqual(g,before);act(g,2,{type:'actionInvestigate',target:3,slot:1});assert.throws(()=>act(g,2,{type:'endTurn'}));act(g,2,{type:'chooseAim',target:0});act(g,2,{type:'endTurn'});assert.notEqual(g.turn,2);}
 assert.ok(g.players[g.turn].alive);for(const p of g.players)if(p.aim!==null)assert.ok(g.players[p.aim].alive);
 const spectator=view(g,g.players[3].token);assert.deepEqual(spectator.known,{});assert.deepEqual(spectator.privateLog,[]);assert.ok(spectator.players[2].cards.every(c=>c.type===null));
});
test('a wounded living target or cancelled shot keeps other gun holders aim unchanged',()=>{
 for(const cancelled of [false,true]){const g=board(4);[g.players[1].cards[0],g.players[2].cards[0]]=[g.players[2].cards[0],g.players[1].cards[0]];g.players[3].gun=true;g.players[3].aim=1;beginShot(g);
 if(cancelled){g.players[1].hand=['vest'];act(g,1,{type:'playEquipment'});}else settle(g);
 assert.ok(g.players[1].alive);assert.equal(g.players[3].aim,1);assert.equal(g.players[1].wounded,!cancelled);}
});
test('stale saved aim is cleaned without replacing pending metadata or selecting a new target',()=>{
 const g=board(4);g.players[1].alive=false;g.players[2].gun=true;g.players[2].aim=1;g.pending={kind:'serum',target:3};const pending=structuredClone(g.pending);
 assert.ok(resolveTimedPending(g));assert.equal(g.players[2].aim,null);assert.deepEqual(g.pending,pending);assert.equal(g.turn,0);assert.equal(resolveTimedPending(g),false);
});
test('malformed/stale shot cannot hit a dead player; endTurn requires a living aim',()=>{
 const g=board(4);g.players[1].alive=false;g.players[0].gun=true;g.players[0].aim=1;const before=structuredClone(g);
 assert.throws(()=>act(g,0,{type:'actionShoot'}));assert.deepEqual(g,before);assert.equal(g.pending,null);
 g.phase='aim';assert.throws(()=>act(g,0,{type:'endTurn'}));act(g,0,{type:'chooseAim',target:2});act(g,0,{type:'endTurn'});assert.equal(g.turn,2);
});
