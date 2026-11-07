import {runSoloGames} from './helpers/solo.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,setBots,startGame,command,botStep,needsBotStep,view,resolveTimedShot} from '../src/engine.mjs';
const game=()=>createRoom('FA1234','Human','person');
test('singleplayer bot room configured from 3 to 7 bots with levels',()=>{
 for(const n of [3,4,5,6,7]){
  const g=game();command(g,'person',{type:'setBots',count:n,level:'hard'});
  assert.equal(g.players.length,n+1);assert.equal(g.players.filter(p=>p.bot).length,n);
  assert.ok(g.players.filter(p=>p.bot).every(p=>p.botLevel==='hard'));
  command(g,'person',{type:'start'});
  assert.equal(g.status,'playing');
  const v=view(g,'person');assert.equal(v.players.filter(p=>p.bot).length,n);
  assert.ok(v.players.filter(p=>p.bot).every(p=>p.cards.every(c=>c.type===null)));
 }
});
test('cannot spoof bot action or change bots after start',()=>{
 const g=game();setBots(g,'person',3);
 assert.throws(()=>command(g,g.players[1].token,{type:'chat',message:'hijack'}),/không hợp lệ/);
 startGame(g,'person');
 assert.throws(()=>command(g,'person',{type:'setBots',count:4}),/phòng chờ/);
 assert.throws(()=>setBots(g,'wrong',3),/chủ phòng/);
});
test('bots continue and finish a full game without client-side hidden data',()=>{runSoloGames();});

test('bots automatically pass or defend during shots, not before',()=>{
 const g=game();setBots(g,'person',3);startGame(g,'person');
 const human=g.players[0];human.gun=true;human.aim=1;human.gunFresh=false;g.turn=0;g.phase='action';
 command(g,'person',{type:'actionShoot'});
 assert.ok(needsBotStep(g));
 let attempts=0;while(needsBotStep(g)&&attempts++<10)botStep(g);
 assert.ok(!needsBotStep(g));
 assert.ok(g.pending?.kind==='shot'||g.phase==='aim');
});
