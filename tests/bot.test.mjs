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
test('bots continue and finish a full game without client-side hidden data',()=>{
 for(const n of [3,5,7])for(const level of ['normal','hard']){
  const g=game();setBots(g,'person',n,level);startGame(g,'person');
  let steps=0;
  while(g.status==='playing'&&steps++<600){
   if(needsBotStep(g))assert.equal(botStep(g),true);
   else if(g.pending?.kind==='shot'){
    if(!g.pending.passes.includes(0))command(g,'person',{type:'passShot'});
    else {g.pending.since=Date.now()-25000;assert.equal(resolveTimedShot(g),true);}
   }else if(g.pending?.kind==='serum'){
    assert.equal(g.pending.target,0);
    command(g,'person',{type:'serumReveal',slot:g.players[0].cards.findIndex(c=>!c.revealed)});
   }else{
    assert.equal(g.turn,0,'bot must have been scheduled instead of user');
    const human=g.players[0];
    if(g.pending?.kind==='reveal')command(g,'person',{type:'chooseReveal',slot:human.cards.findIndex(c=>!c.revealed)});
    else if(g.pending?.kind==='discard')command(g,'person',{type:'discardHand',index:0});
    else if(g.phase==='aim'){
     if(human.gun&&human.aim===null)command(g,'person',{type:'chooseAim',target:g.players.findIndex((p,i)=>i!==0&&p.alive)});
     else command(g,'person',{type:'endTurn'});
    }else{
     const target=g.players.findIndex((p,i)=>i!==0&&p.alive&&!p.effects.disguise&&p.cards.some(c=>!c.revealed));
     if(target>=0)command(g,'person',{type:'actionInvestigate',target,slot:g.players[target].cards.findIndex(c=>!c.revealed)});
     else if(human.gun&&human.aim!==null&&!human.gunFresh)command(g,'person',{type:'actionShoot'});
     else command(g,'person',{type:'actionEquip'});
    }
   }
  }
  assert.equal(g.status,'finished',`n=${n},level=${level},steps=${steps}`);
 }
});
test('bots automatically pass or defend during shots, not before',()=>{
 const g=game();setBots(g,'person',3);startGame(g,'person');
 const human=g.players[0];human.gun=true;human.aim=1;human.gunFresh=false;g.turn=0;g.phase='action';
 command(g,'person',{type:'actionShoot'});
 assert.ok(needsBotStep(g));
 let attempts=0;while(needsBotStep(g)&&attempts++<10)botStep(g);
 assert.ok(!needsBotStep(g));
 assert.ok(g.pending?.kind==='shot'||g.phase==='aim');
});
