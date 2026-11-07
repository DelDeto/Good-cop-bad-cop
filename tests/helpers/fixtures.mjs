import {createRoom,joinRoom,startGame,command} from '../../src/engine.mjs';
export function fixture(){
 const g=createRoom('ABC123','An','SESSION-A-SECRET');
 for(const [name,token] of [['Bình','SESSION-B-SECRET'],['Chi','SESSION-C-SECRET'],['Dũng','SESSION-D-SECRET']])joinRoom(g,name,token);
 startGame(g,g.ownerToken);
 // Keep both leaders, known positions and a deterministic ordinary Bribe target.
 g.players.forEach((p,i)=>{p.hand=[];p.cards.forEach((c,j)=>{c.type=i===2&&j===0?'agent':i===3&&j===0?'kingpin':(i+j)%2?'honest':'crooked';});});
 return g;
}
export const act=(g,i,cmd)=>command(g,g.players[i].token,cmd);
export function bribeFixture(){const g=fixture();g.players[0].hand=['bribe'];act(g,0,{type:'playEquipment',target:1,slot:2});return g;}
