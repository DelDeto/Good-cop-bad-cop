import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,startGame,command,view,resolveTimedPending} from '../src/engine.mjs';
function game(n=4){const g=createRoom('EQV190','Người 0','t0');for(let i=1;i<n;i++)joinRoom(g,'Người '+i,'t'+i);startGame(g,'t0');return g;}
const act=(g,n,c)=>command(g,'t'+n,c);
test('leader wound travels with leader card in Blackmail, not with seat',()=>{
 const g=game(5),leader=g.players.findIndex(p=>p.cards.some(c=>c.type==='agent')),other=g.players.findIndex((p,i)=>i!==leader&&p.cards.every(c=>!['agent','kingpin'].includes(c.type))),actor=g.players.findIndex((p,i)=>i!==leader&&i!==other);
 const sl=g.players[leader].cards.findIndex(c=>c.type==='agent');g.players[leader].wounded=true;g.players[actor].hand=['blackmail'];
 const originalId=g.players[leader].cards[sl].id;
 act(g,actor,{type:'playEquipment',target:leader,slot:sl,target2:other,slot2:0});
 assert.equal(g.players[leader].wounded,false);assert.equal(g.players[other].wounded,true);
 assert.equal(g.players[other].cards[0].id,originalId);assert.equal(g.status,'playing');
});
test('wound also travels if Bribe swaps owned leader for an ordinary target card',()=>{
 const g=game(4),leader=g.players.findIndex(p=>p.cards.some(c=>c.type==='agent')),other=g.players.findIndex((p,i)=>i!==leader&&p.cards.every(c=>!['agent','kingpin'].includes(c.type)));
 g.players[leader].wounded=true;g.players[leader].hand=['bribe'];const ownSlot=g.players[leader].cards.findIndex(c=>c.type==='agent');
 act(g,leader,{type:'playEquipment',target:other,slot:0});
 const pending=g.pending;assert.equal(pending.kind,'bribe');act(g,leader,{type:'resolveBribe',decisionId:pending.decisionId,swap:true,ownSlot});
 assert.equal(g.players[other].wounded,true);assert.equal(g.players[leader].wounded,false);
 assert.ok(g.players[other].cards.some(c=>c.type==='agent'));
});
test('Walkie Talkie synchronizes pending shot victim with new aimed target',()=>{
 const g=game(5);g.players[0].gun=true;g.players[0].aim=1;g.players[0].gunFresh=false;g.players[3].hand=['walkie'];
 act(g,0,{type:'actionShoot'});assert.equal(g.pending.victim,1);
 act(g,3,{type:'playEquipment',target:2});
 assert.equal(g.players[0].aim,2);assert.equal(g.pending.victim,2);
 assert.deepEqual(g.pending.passes,[0]);
 for(let i=1;i<5;i++)act(g,i,{type:'passShot'});
 assert.equal(g.pending,null);assert.ok(g.players[1].cards.every(c=>!c.revealed));assert.ok(g.players[2].cards.every(c=>c.revealed));
});
test('Truth Serum fourth edition lets equipment owner pick precise hidden slot; no target response pending',()=>{
 const g=game(4);g.players[2].hand=['serum'];const idx=1;assert.equal(g.players[1].cards[idx].revealed,false);
 act(g,2,{type:'playEquipment',target:1,slot:idx});
 assert.equal(g.players[1].cards[idx].revealed,true);assert.equal(g.pending,null);
 assert.ok(g.players[1].cards.some((c,i)=>i!==idx&&!c.revealed));
});
test('Truth Serum rejects invalid or already revealed selection without consuming equipment',()=>{
 const g=game(4);g.players[0].hand=['serum'];g.players[1].cards[0].revealed=true;
 assert.throws(()=>act(g,0,{type:'playEquipment',target:1,slot:0}),/Lá bài này đã lật/);
 assert.deepEqual(g.players[0].hand,['serum']);
});
test('Evidence Bag transfers card to recipient, receiver discards outside their turn',()=>{
 const g=game(4);g.players[0].hand=['evidence'];g.players[1].hand=['vest'];g.players[2].hand=['k9'];
 act(g,0,{type:'playEquipment',target:1,target2:2});
 assert.equal(g.pending.kind,'equipment-discard');assert.equal(g.pending.owner,2);assert.deepEqual(g.players[2].hand,['k9','vest']);
 assert.deepEqual(g.players[1].hand,[]);assert.deepEqual(g.players[0].hand,[]);
 assert.throws(()=>act(g,0,{type:'discardHand',index:0}),/Người nhận phải bỏ/);
 act(g,2,{type:'discardHand',index:0});
 assert.deepEqual(g.players[2].hand,['vest']);assert.equal(g.pending,null);assert.equal(g.turn,0);
});
test('Evidence Bag recipient timeout safely discards newly received card, keeps earlier one',()=>{
 const g=game(4);g.players[0].hand=['evidence'];g.players[1].hand=['vest'];g.players[2].hand=['k9'];
 act(g,0,{type:'playEquipment',target:1,target2:2});g.pending.deadline=Date.now()-1;
 assert.equal(resolveTimedPending(g),true);assert.equal(g.pending,null);assert.deepEqual(g.players[2].hand,['k9']);
 assert.ok(g.discard.includes('vest'));
});
test('Evidence Bag invalid receiver does not mutate state',()=>{
 const g=game(4);g.players[0].hand=['evidence'];const before=structuredClone(g);
 assert.throws(()=>act(g,0,{type:'playEquipment',target:1,target2:0}));assert.deepEqual(g,before);
});