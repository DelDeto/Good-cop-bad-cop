import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRoom,joinRoom,startGame,command,view,botStep,needsBotStep,shotDeadline,resolveTimedShot} from '../src/engine.mjs';
function game(){const g=createRoom('SPR001','A','t0');for(let i=1;i<4;i++)joinRoom(g,String.fromCharCode(65+i),'t'+i);startGame(g,'t0');for(const p of g.players)p.hand=[];return g;}
const act=(g,i,cmd)=>command(g,'t'+i,cmd);
const key=(g,i,slot)=>`${g.players[i].id}:${slot}`;
function beginBribe(type='honest',owner=0){const g=game();g.players[owner].hand=['bribe'];g.players[1].cards[2].type=type;act(g,owner,{type:'playEquipment',target:1,slot:2});return g;}
function decide(g,swap,ownSlot=0,owner=0){act(g,owner,{type:'resolveBribe',decisionId:g.pending?.decisionId,swap,ownSlot});}
test('Wire owner receives exact nonfirst investigation; all other secrets remain private',()=>{
 const g=game();g.players[0].hand=['wire'];act(g,0,{type:'playEquipment',target:1});g.turn=1;
 act(g,1,{type:'actionInvestigate',target:2,slot:2});
 assert.equal(g.pending?.kind,'investigation-reaction');assert.equal(g.pending.owner,0);
 act(g,0,{type:'resolveInvestigationReaction',slot:2});
 for(const i of [0,1])assert.deepEqual(Object.keys(view(g,'t'+i).known),[key(g,2,2)]);
 for(const i of [2,3])assert.deepEqual(view(g,'t'+i).known,{});
 assert.equal(g.players[0].known[key(g,2,2)].type,g.players[2].cards[2].type);
 assert.equal(g.activeCards[0].owner,0);assert.equal(g.activeCards[0].target,1);
});
test('Wire does not trigger on unrelated players, invalid investigations or dead owner',()=>{
 const g=game();g.players[0].hand=['wire'];act(g,0,{type:'playEquipment',target:1});g.turn=3;
 act(g,3,{type:'actionInvestigate',target:2,slot:1});assert.deepEqual(g.players[0].known,{});
 g.turn=1;g.phase='action';g.players[2].effects.disguise=true;assert.throws(()=>act(g,1,{type:'actionInvestigate',target:2,slot:1}));assert.deepEqual(g.players[0].known,{});
 delete g.players[2].effects.disguise;g.players[0].alive=false;act(g,1,{type:'actionInvestigate',target:2,slot:1});assert.deepEqual(g.players[0].known,{});
});
test('Wire supports multiple owners watching distinct players and equipment investigations',()=>{
 const g=game();g.players[0].hand=['wire'];act(g,0,{type:'playEquipment',target:1});g.players[3].hand=['wire'];act(g,3,{type:'playEquipment',target:2});
 g.players[1].hand=['wiretap'];act(g,1,{type:'playEquipment',target:2,slot:1,target2:3,slot2:2});
 assert.equal(g.pending?.owner,0);assert.equal(g.pending.target,2);act(g,0,{type:'resolveInvestigationReaction',slot:1});
 assert.equal(g.pending?.owner,0);assert.equal(g.pending.target,3);act(g,0,{type:'resolveInvestigationReaction',slot:2});
 assert.ok(g.players[0].known[key(g,2,1)]);assert.ok(g.players[0].known[key(g,3,2)]);assert.deepEqual(g.players[3].known,{});
 g.turn=2;g.phase='action';act(g,2,{type:'actionInvestigate',target:0,slot:0});assert.equal(g.pending?.owner,3);act(g,3,{type:'resolveInvestigationReaction',slot:0});assert.ok(g.players[3].known[key(g,0,0)]);assert.equal(g.players[0].known[key(g,0,0)],undefined);
});
test('Bribe ordinary: consume before decision, private result, locked pending, swap clears stale knowledge',()=>{
 const g=beginBribe();const card=g.players[1].cards[2],own=g.players[0].cards[0];
 assert.deepEqual(g.players[0].hand,[]);assert.equal(g.discard.filter(x=>x==='bribe').length,1);
 assert.equal(view(g,'t0').known[key(g,1,2)].type,'honest');assert.equal(view(g,'t0').pending.canSwap,true);
 for(const i of [1,2,3]){const v=view(g,'t'+i);assert.deepEqual(v.known,{});assert.deepEqual(v.pending,{kind:'bribe',owner:0});assert.equal(v.privateLog.length,0);}
 assert.ok(!JSON.stringify(view(g,'t0').pending).includes(card.id));
 for(const cmd of [{type:'actionInvestigate',target:2,slot:0},{type:'restart'},{type:'playEquipment',target:2,slot:0}])assert.throws(()=>act(g,0,cmd));
 const before=structuredClone(g);assert.throws(()=>act(g,1,{type:'resolveBribe',decisionId:g.pending.decisionId,swap:true,ownSlot:0}));assert.deepEqual(g,before);
 g.players[2].known[key(g,1,2)]={type:card.type,cardId:card.id};g.players[3].known[key(g,0,0)]={type:own.type,cardId:own.id};
 const id=g.pending.decisionId;decide(g,true);assert.equal(g.players[0].cards[0],card);assert.equal(g.players[1].cards[2],own);assert.equal(g.pending,null);
 assert.deepEqual(g.players[2].known,{});assert.deepEqual(g.players[3].known,{});assert.equal(g.players[0].known[key(g,1,2)].cardId,own.id);
 assert.throws(()=>act(g,0,{type:'resolveBribe',decisionId:id,swap:true,ownSlot:0}));
});
test('Bribe leader is legitimately investigated and consumed, swap forbidden, decline allowed',()=>{
 for(const type of ['agent','kingpin']){const g=beginBribe(type);assert.equal(view(g,'t0').known[key(g,1,2)].type,type);assert.equal(view(g,'t0').pending.canSwap,false);const before=structuredClone(g);assert.throws(()=>decide(g,true));assert.deepEqual(g,before);decide(g,false);assert.equal(g.pending,null);assert.equal(g.players[0].hand.length,0);}
});
test('Bribe declined on ordinary card keeps identities and private knowledge',()=>{
 const g=beginBribe();const cards=g.players.map(p=>structuredClone(p.cards));decide(g,false);assert.deepEqual(g.players.map(p=>p.cards),cards);assert.equal(g.players[0].known[key(g,1,2)].type,'honest');assert.equal(g.pending,null);
});
test('Bribe invalid first-stage ownSlot requests are identical for leader and ordinary with no mutation',()=>{
 const errors=[];for(const type of ['honest','agent','kingpin']){const g=game();g.players[0].hand=['bribe'];g.players[1].cards[2].type=type;const before=structuredClone(g);assert.throws(()=>act(g,0,{type:'playEquipment',target:1,slot:2,ownSlot:0}),e=>{errors.push(e.message);return true;});assert.deepEqual(g,before);}
 assert.equal(new Set(errors).size,1);
});
test('Bribe invalid targets and decisions do not reveal or mutate; stale decision rejected',()=>{
 const g=game();g.players[0].hand=['bribe'];for(const slot of [-1,3,null,'',true]){const before=structuredClone(g);assert.throws(()=>act(g,0,{type:'playEquipment',target:1,slot}));assert.deepEqual(g,before);}
 act(g,0,{type:'playEquipment',target:1,slot:2});for(const cmd of [{swap:true,ownSlot:99},{swap:'yes'},{swap:false,decisionId:'stale'}]){const before=structuredClone(g);assert.throws(()=>act(g,0,{type:'resolveBribe',decisionId:g.pending.decisionId,...cmd}));assert.deepEqual(g,before);}
});
test('BOT watched investigation uses normal Wire privacy; BOT Bribe resolves out of turn without stuck main turn',()=>{
 const g=game();g.players[0].hand=['wire'];act(g,0,{type:'playEquipment',target:1});g.players[1].bot=true;g.turn=1;g.gunTotal=0;
 assert.ok(botStep(g));assert.equal(g.pending?.kind,'investigation-reaction');assert.equal(g.pending.owner,0);act(g,0,{type:'resolveInvestigationReaction',slot:0});assert.equal(Object.keys(g.players[0].known).length,1);assert.deepEqual(g.players[3].known,{});
 const b=beginBribe('honest',2);b.players[2].bot=true;assert.equal(needsBotStep(b),true);assert.ok(botStep(b));assert.equal(b.pending,null);assert.equal(b.turn,0);
 const human=beginBribe();human.players[human.turn].bot=false;human.players[1].bot=true;assert.equal(needsBotStep(human),false);
});
function shot(){const g=game();g.players[0].gun=true;g.players[0].aim=1;act(g,0,{type:'actionShoot'});return g;}
test('shoot reactions redirect before defence, reset passes and deadline, reconnect restores public state',()=>{
 const g=shot();g.players[1].hand=['shield'];g.players[2].hand=['vest'];
 act(g,3,{type:'passShot'});g.players[3].bot=true;const since=g.pending.since;act(g,1,{type:'playEquipment',target:2});assert.equal(g.pending.victim,2);assert.deepEqual(g.pending.passes,[0]);assert.ok(g.pending.since>=since);
 const restored=JSON.parse(JSON.stringify(g));assert.deepEqual(view(restored,'t2'),view(g,'t2'));assert.equal(view(restored,'t2').pending.deadline,shotDeadline(g));assert.ok(view(restored,'t1').players[2].cards.every(c=>c.type===null));
 act(g,2,{type:'playEquipment'});assert.equal(g.pending,null);assert.ok(g.players[2].alive);assert.ok(g.players[2].cards.every(c=>!c.revealed));assert.equal(g.players[0].gun,false);
});
test('shot pass/force/timed order and invalid reaction leave private state intact',()=>{
 const g=shot();g.players[2].hand=['vest'];const before=structuredClone(g);assert.throws(()=>act(g,2,{type:'playEquipment'}));assert.deepEqual(g,before);assert.throws(()=>act(g,0,{type:'forceShot'}));assert.equal(resolveTimedShot(g),false);
 act(g,1,{type:'passShot'});act(g,2,{type:'passShot'});assert.equal(g.pending.kind,'shot');act(g,3,{type:'passShot'});assert.equal(g.pending,null);
 const timed=shot();timed.players[3].bot=true;timed.pending.since=Date.now()-21000;assert.equal(resolveTimedShot(timed),true);assert.equal(resolveTimedShot(timed),false);
});
test('Cloudflare assets generated exactly from public source',()=>{
 for(const [source,dest] of [['app.js','app.txt'],['style.css','style.txt'],['index.html','index.txt']])assert.equal(fs.readFileSync(new URL('../public/'+source,import.meta.url),'utf8'),fs.readFileSync(new URL('../assets/'+dest,import.meta.url),'utf8'));
});
test('Wire owner may be a BOT and Bribe investigation shares only the watched result',()=>{
 const g=game();g.players[0].hand=['wire'];act(g,0,{type:'playEquipment',target:1});g.players[0].bot=true;
 g.players[1].hand=['bribe'];act(g,1,{type:'playEquipment',target:2,slot:2});
 assert.deepEqual(Object.keys(g.players[0].known),[]);assert.deepEqual(g.players[3].known,{});
 assert.deepEqual(view(g,'t0').pending,{kind:'bribe',owner:1});assert.equal(needsBotStep(g),false);
 act(g,1,{type:'resolveBribe',decisionId:g.pending.decisionId,swap:false});
 assert.equal(g.pending?.kind,'investigation-reaction');assert.equal(g.pending.owner,0);assert.ok(needsBotStep(g));
 assert.ok(botStep(g));assert.equal(Object.keys(g.players[0].known).length,1);
});
