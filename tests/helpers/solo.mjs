import assert from 'node:assert/strict';
import {createRoom,setBots,startGame,command,botStep,needsBotStep,resolveTimedShot} from '../../src/engine.mjs';
const game=()=>createRoom('FA1234','Human','person');
// Public-state invariants fail at the first illegal transition, before choosing
// the next human action; do not silently re-aim to hide an engine regression.
function assertLiveState(g){
 if(g.status==='playing')assert.ok(g.players[g.turn].alive,'dead active turn');
 for(const p of g.players)if(p.gun&&p.aim!==null)assert.ok(g.players[p.aim]?.alive,'gun retains a dead/missing target');
 if(g.pending?.kind==='shot')assert.ok(g.players[g.pending.victim]?.alive,'shot at a dead victim');
}
export function runSoloGames(){

 for(const n of [3,5,7])for(const level of ['normal','hard']){
  const g=game();setBots(g,'person',n,level);startGame(g,'person');
  let steps=0;
  while(g.status==='playing'&&steps++<600){
   assertLiveState(g);
   if(needsBotStep(g))assert.equal(botStep(g),true);
   else if(g.pending?.kind==='shot'){
    if(!g.pending.passes.includes(0))command(g,'person',{type:'passShot'});
    else {g.pending.since=Date.now()-25000;assert.equal(resolveTimedShot(g),true);}
   }else if(g.pending?.kind==='investigation-reaction'){
    assert.equal(g.pending.owner,0,'Only human may handle this pending response');
    const target=g.players[g.pending.target],slot=target.cards.findIndex(c=>!c.revealed);
    command(g,'person',slot>=0?{type:'resolveInvestigationReaction',slot}:{type:'passInvestigationReaction'});
   }else if(g.pending?.kind==='equipment-discard'){
    assert.equal(g.pending.owner,0,'Only human may discard off-turn');
    command(g,'person',{type:'discardHand',index:0});
   }else if(g.pending?.kind==='serum'){
    // Legacy rooms created before fourth-edition Serum changes.
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
  assertLiveState(g);
  assert.equal(g.status,'finished',`n=${n},level=${level},steps=${steps}`);
 }

}
