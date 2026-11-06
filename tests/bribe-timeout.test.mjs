import test from 'node:test';
import assert from 'node:assert/strict';
import {BRIBE_DECISION_MS,bribeDeadline,pendingDeadline,resolveTimedBribe,resolveTimedPending,view} from '../src/engine.mjs';
import {act,bribeFixture} from './helpers/fixtures.mjs';

test('Bribe timeout boundary auto-declines once, preserves private investigation and spent card',t=>{
 const g=bribeFixture(),deadline=g.pending.deadline,cards=structuredClone(g.players.map(p=>p.cards)),known=structuredClone(g.players[0].known),id=g.pending.decisionId;
 assert.equal(pendingDeadline(g),deadline);assert.ok(deadline-Date.now()<=BRIBE_DECISION_MS);
 t.mock.timers.enable({apis:['Date'],now:deadline-1});assert.equal(resolveTimedBribe(g),false);
 // Reconnect/read and chat must never renew the deadline.
 view(g,g.ownerToken);act(g,0,{type:'chat',message:'back'});assert.equal(bribeDeadline(g),deadline);
 t.mock.timers.setTime(deadline);assert.equal(resolveTimedPending(g),true);assert.equal(resolveTimedPending(g),false);
 assert.equal(g.pending,null);assert.equal(g.turn,0);assert.equal(g.phase,'action');assert.deepEqual(g.players.map(p=>p.cards),cards);assert.deepEqual(g.players[0].known,known);assert.deepEqual(g.players[0].hand,[]);assert.equal(g.discard.filter(x=>x==='bribe').length,1);
 assert.throws(()=>act(g,0,{type:'resolveBribe',decisionId:id,swap:true,ownSlot:0}));
 act(g,0,{type:'actionInvestigate',target:2,slot:1});assert.equal(g.phase,'aim');
});
test('late owner command cannot race deadline to exchange; early decision cancels expiration',t=>{
 const expired=bribeFixture(),original=structuredClone(expired.players.map(p=>p.cards));const cmd={type:'resolveBribe',decisionId:expired.pending.decisionId,swap:true,ownSlot:0};
 t.mock.timers.enable({apis:['Date'],now:expired.pending.deadline});assert.throws(()=>act(expired,0,cmd));assert.deepEqual(expired.players.map(p=>p.cards),original);assert.equal(expired.pending,null);
 const early=bribeFixture();const oldDeadline=early.pending.deadline;act(early,0,{type:'resolveBribe',decisionId:early.pending.decisionId,swap:true,ownSlot:0});const after=structuredClone(early);t.mock.timers.setTime(oldDeadline+1);assert.equal(resolveTimedBribe(early),false);assert.deepEqual(early,after);
});
test('legacy pending without timestamp declines safely on recovery with no private log in public output',()=>{
 const g=bribeFixture();delete g.pending.deadline;assert.equal(bribeDeadline(g),0);assert.equal(resolveTimedBribe(g),true);assert.deepEqual(view(g,g.players[3].token).known,{});assert.equal(view(g,g.players[3].token).privateLog.length,0);
});
test('pending Bribe blocks card-moving equipment and ignores client deadline/target overrides',()=>{
 const g=bribeFixture(),before=structuredClone(g),deadline=g.pending.deadline;
 for(const cmd of [{type:'playEquipment',target:0,target2:1,slot:0,slot2:2},{type:'restart'},{type:'chooseReveal',slot:0}]){assert.throws(()=>act(g,1,cmd));assert.deepEqual(g,before);}
 const card=g.players[1].cards[2],other=g.players[2].cards[0];
 act(g,0,{type:'resolveBribe',decisionId:g.pending.decisionId,swap:true,ownSlot:0,target:2,slot:0,cardId:other.id,deadline:deadline+100000});
 assert.equal(g.players[0].cards[0],card);assert.equal(g.players[2].cards[0],other);
});
