import assert from 'node:assert/strict';
import {createRoom,joinRoom,startGame,command,botStep} from '../../src/engine.mjs';
export function board(n=4){
 const g=createRoom('FIX161','P0','SESSION-SECRET-0');for(let i=1;i<n;i++)joinRoom(g,'P'+i,'SESSION-SECRET-'+i);startGame(g,g.ownerToken);
 g.players.forEach((p,i)=>{p.hand=[];p.cards.forEach((c,j)=>{c.type=i===n-2&&j===0?'agent':i===n-1&&j===0?'kingpin':(i+j)%2?'honest':'crooked';});});g.gunTotal=0;return g;
}
export const act=(g,i,cmd)=>command(g,g.players[i].token,cmd);
export function beginShot(g){g.players[0].gun=true;g.players[0].aim=1;act(g,0,{type:'actionShoot'});}
export function redirect(g){g.players[1].hand=['shield'];act(g,1,{type:'playEquipment',target:0});assert.equal(g.pending.victim,0);}
export function settle(g){for(let steps=0;g.pending?.kind==='shot'&&steps<g.players.length*2;steps++){
 const i=g.players.findIndex((p,i)=>p.alive&&!g.pending.passes.includes(i));assert.ok(i>=0);if(g.players[i].bot)assert.ok(botStep(g));else act(g,i,{type:'passShot'});
 }assert.equal(g.pending,null);}
