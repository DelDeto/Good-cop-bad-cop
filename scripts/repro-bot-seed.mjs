// Test-only deterministic reproduction; never contacts a server or changes production RNG.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const engine=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:new URL('../src/engine.mjs',import.meta.url).href);
const {createRoom,setBots,startGame,command,botStep,needsBotStep,view,resolveTimedShot}=engine;
const game=()=>createRoom('FA1234','Human','person');
const seed=Number(process.argv[3]||1558);
assert.ok(Number.isInteger(seed)&&seed>0&&seed<=0xffffffff,'seed must be uint32 and nonzero');
let context;
const run=()=>{
 for(const n of [3,5,7])for(const level of ['normal','hard']){
  const g=game();context={n,level};setBots(g,'person',n,level);startGame(g,'person');
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
};
let state=seed>>>0;
Object.defineProperty(crypto,'getRandomValues',{configurable:true,value:a=>{for(let i=0;i<a.length;i++){state^=state<<13;state^=state>>>17;state^=state<<5;a[i]=state>>>0;}return a;}});
try{run();console.log(JSON.stringify({seed,status:'PASS',games:6},null,2));}
catch(e){console.log(JSON.stringify({seed,status:'FAIL',context,error:e.message},null,2));process.exitCode=1;}
