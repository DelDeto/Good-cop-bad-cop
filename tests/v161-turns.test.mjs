import test from 'node:test';
import assert from 'node:assert/strict';
import {view,botStep,needsBotStep,pendingDeadline,resolveTimedPending} from '../src/engine.mjs';
import {board,act,beginShot,redirect,settle} from './helpers/turns.mjs';

function privacy(g){for(let viewer=0;viewer<g.players.length;viewer++){
 const v=view(g,g.players[viewer].token);for(const p of g.players)assert.ok(!JSON.stringify(v).includes(p.token));
 for(const [i,p] of v.players.entries())for(const [j,c] of p.cards.entries())assert.equal(c.type,g.players[i].cards[j].revealed?g.players[i].cards[j].type:null);
 assert.deepEqual(v.known,g.players[viewer].known);assert.deepEqual(v.privateLog,g.players[viewer].privateLog.slice(-12));
 }}
function progresses(g,bots){assert.equal(g.status,'playing');assert.ok(g.players[g.turn].alive);assert.equal(g.winner,null);
 if(bots){assert.equal(needsBotStep(g),true);const round=g.round;for(let step=0;g.round===round&&step<6;step++){assert.ok(botStep(g));assert.ok(g.players[g.turn].alive);}assert.ok(g.round>round,'BOT completes a living turn without looping');}
 else{const turn=g.turn;act(g,turn,{type:'actionInvestigate',target:g.players.findIndex((p,i)=>p.alive&&i!==turn&&p.cards.some(c=>!c.revealed)),slot:1});act(g,turn,{type:'endTurn'});assert.ok(g.players[g.turn].alive);}
 privacy(g);
}
for(const n of [4,8])for(const direction of [1,-1])for(const bots of [false,true]){
 const suffix=`${n} players, direction ${direction}, ${bots?'BOT':'human'}`;
 test(`FIX-01: redirected ordinary shooter eliminated advances exactly once (${suffix})`,()=>{
  const g=board(n);g.direction=direction;beginShot(g);redirect(g);if(bots)g.players.forEach(p=>p.bot=true);settle(g);
  assert.equal(g.players[0].alive,false);assert.equal(g.turn,direction===1?1:n-1);assert.equal(g.round,2);assert.equal(g.phase,'action');assert.equal(g.lastInvestigate,null);progresses(g,bots);
 });
 test(`FIX-01: redirected leader shooter wounded retains aim turn (${suffix})`,()=>{
  const g=board(n);[g.players[0].cards[0],g.players[n-2].cards[0]]=[g.players[n-2].cards[0],g.players[0].cards[0]];g.direction=direction;
  beginShot(g);redirect(g);if(bots)g.players.forEach(p=>p.bot=true);settle(g);
  assert.ok(g.players[0].alive);assert.ok(g.players[0].wounded);assert.equal(g.turn,0);assert.equal(g.round,1);assert.equal(g.phase,'aim');assert.equal(g.winner,null);privacy(g);
  if(bots)assert.ok(botStep(g));else act(g,0,{type:'endTurn'});assert.equal(g.turn,direction===1?1:n-1);assert.equal(g.round,2);
 });
 for(const alive of [false,true])test(`FIX-02: Coffee ${alive?'living':'eliminated'} recipient (${suffix})`,()=>{
  const g=board(n);g.direction=direction;g.players[1].hand=['coffee'];act(g,1,{type:'playEquipment'});assert.equal(g.coffeeNext,1);
  if(alive){act(g,0,{type:'actionInvestigate',target:1,slot:0});}
  else{beginShot(g);if(bots)g.players.forEach(p=>p.bot=true);settle(g);assert.equal(g.players[1].alive,false);}
  if(bots)g.players.forEach(p=>p.bot=true);
  if(bots)assert.ok(botStep(g));else act(g,0,{type:'endTurn'});
  assert.equal(g.turn,alive?1:direction===1?2:n-1);assert.equal(g.coffeeNext,null);assert.equal(g.round,2);assert.equal(g.phase,'action');progresses(g,bots);
 });
}
for(const n of [4,8])for(const role of ['agent','kingpin'])for(const bots of [false,true])test(`wounded ${role} shooter eliminated ends game before another turn (${n}, ${bots?'BOT':'human'})`,()=>{
 const g=board(n),seat=role==='agent'?n-2:n-1;[g.players[0].cards[0],g.players[seat].cards[0]]=[g.players[seat].cards[0],g.players[0].cards[0]];g.players[0].wounded=true;
 beginShot(g);redirect(g);if(bots)g.players.forEach(p=>p.bot=true);settle(g);
 assert.equal(g.status,'finished');assert.equal(g.round,1);assert.match(g.winner,role==='agent'?/Mafia thắng/:/Điệp viên thắng/);assert.equal(needsBotStep(g),false);privacy(g);
});
test('Coffee dead stale pointer in restored state is skipped; normal order skips several eliminated seats',()=>{
 const g=board(8);g.players[1].alive=false;g.players[2].alive=false;g.coffeeNext=1;g.phase='aim';act(g,0,{type:'endTurn'});assert.equal(g.turn,3);assert.equal(g.coffeeNext,null);
});
test('Coffee remains honored when the shooter dies and direction reverses before resolution',()=>{
 const g=board(8);g.players[4].hand=['coffee'];act(g,4,{type:'playEquipment'});beginShot(g);redirect(g);g.players[3].hand=['smoke'];act(g,3,{type:'playEquipment'});assert.equal(g.direction,-1);settle(g);assert.equal(g.turn,4);assert.equal(g.coffeeNext,null);assert.equal(g.round,2);privacy(g);
});
test('Coffee victim leader dies: existing winning check takes priority over a future extra turn',()=>{
 const g=board(4);g.players[2].wounded=true;g.players[2].hand=['coffee'];act(g,2,{type:'playEquipment'});g.players[0].gun=true;g.players[0].aim=2;act(g,0,{type:'actionShoot'});settle(g);assert.equal(g.status,'finished');assert.match(g.winner,/Mafia thắng/);assert.equal(g.round,1);privacy(g);
});
test('Serum audit: offline human choice has no deadline; reconnect is lossless but does not unblock it',t=>{
 const g=board();g.players[0].hand=['serum'];act(g,0,{type:'playEquipment',target:1});const before=structuredClone(g);const snapshot=view(g,g.players[1].token);
 t.mock.timers.enable({apis:['Date'],now:Date.now()+3600000});assert.equal(pendingDeadline(g),null);assert.equal(resolveTimedPending(g),false);assert.deepEqual(view(JSON.parse(JSON.stringify(g)),g.players[1].token),snapshot);assert.deepEqual(g,before);assert.throws(()=>act(g,0,{type:'actionEquip'}));
 assert.deepEqual(g.players[2].known,{});assert.equal(g.players[1].cards.some(c=>c.revealed),false);
 act(g,1,{type:'serumReveal',slot:2});assert.equal(g.pending,null);assert.equal(g.players[1].cards[2].revealed,true);
});
test('dead-turn recovery preserves pending Serum and terminal win precedence',()=>{
 const g=board();g.players[0].hand=['serum'];act(g,0,{type:'playEquipment',target:1});g.players[0].alive=false;
 const before=structuredClone(g);assert.equal(resolveTimedPending(g),false);assert.deepEqual(g,before);
 const terminal=board();terminal.players[2].alive=false;terminal.turn=2;assert.ok(resolveTimedPending(terminal));assert.equal(terminal.status,'finished');assert.match(terminal.winner,/Mafia thắng/);assert.equal(terminal.round,1);
});
