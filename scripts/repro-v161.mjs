// Deterministic engine-only repro; never contacts or seeds a live server/Worker.
// Optional argument: path to an older engine.mjs for before/after comparison.
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const engine=await import(process.argv[2]?pathToFileURL(path.resolve(process.argv[2])).href:new URL('../src/engine.mjs',import.meta.url).href);
const {createRoom,joinRoom,startGame,command}=engine;
function board(){const g=createRoom('FIX161','A','test-A');for(const [name,token] of [['B','test-B'],['C','test-C'],['D','test-D']])joinRoom(g,name,token);startGame(g,g.ownerToken);g.players.forEach((p,i)=>{p.hand=[];p.cards.forEach((c,j)=>c.type=i===2&&j===0?'agent':i===3&&j===0?'kingpin':'honest');});return g;}
const act=(g,i,cmd)=>command(g,g.players[i].token,cmd);
function shoot(g){g.players[0].gun=true;g.players[0].aim=1;act(g,0,{type:'actionShoot'});}
function settle(g){for(let i=1;i<4;i++)act(g,i,{type:'passShot'});}
const shield=board();shoot(shield);shield.players[1].hand=['shield'];act(shield,1,{type:'playEquipment',target:0});settle(shield);
const coffee=board();coffee.players[1].hand=['coffee'];act(coffee,1,{type:'playEquipment'});shoot(coffee);settle(coffee);act(coffee,0,{type:'endTurn'});
console.log(JSON.stringify([
 {fix:'FIX-01',status:shield.status,shooterAlive:shield.players[0].alive,turn:shield.turn,livingTurn:shield.players[shield.turn].alive,phase:shield.phase,turnSequence:shield.round},
 {fix:'FIX-02',status:coffee.status,coffeeUserAlive:coffee.players[1].alive,turn:coffee.turn,livingTurn:coffee.players[coffee.turn].alive,coffeeNext:coffee.coffeeNext,turnSequence:coffee.round}
],null,2));
