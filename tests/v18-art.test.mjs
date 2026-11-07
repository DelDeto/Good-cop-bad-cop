import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {checkArt} from '../scripts/check-art.mjs';
import {fixture} from './helpers/fixtures.mjs';
import {view} from '../src/engine.mjs';
const source=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
function app(){const nodes=new Map();for(const id of ['#root','#modal','#toast'])nodes.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});const c=vm.createContext({document:{querySelector:s=>nodes.get(s)||null},window:{},location:{search:''},localStorage:{getItem(){return null}},URLSearchParams,FormData,console,setTimeout,clearTimeout});vm.runInContext(source,c);return {c,nodes};}
test('V1.8 final art inventory, hashes, dimensions, file budget and equipment order are complete',()=>{assert.equal(checkArt().images.length,5);});
test('portrait assignment cannot encode secret roles, teams or BOT knowledge',()=>{const {c}=app();for(let seat=0;seat<8;seat++){c.person={seat,bot:false,cards:[{type:'honest'}]};const a=vm.runInContext('agentAvatar(person)',c);c.person.cards[0].type='kingpin';c.person.bot=true;assert.equal(vm.runInContext('agentAvatar(person)',c),a);assert.match(a,new RegExp(`data-portrait="${seat}"`));}});
test('all equipment tiles use a clipped square viewport to prevent adjacent artwork bleeding',()=>{const {c}=app();for(let i=0;i<23;i++){const a=vm.runInContext(`equipmentIllustration(${i})`,c);assert.match(a,/viewBox="0 0 256 256"/);assert.match(a,/overflow="hidden"/);assert.match(a,/<image href="\/item-art.webp/);}});
test('revealed role illustration is emitted only when own/public/known information permits it',()=>{const {c}=app(),g=fixture();c.fixture=view(g,g.ownerToken);vm.runInContext('state=fixture;render()',c);const hidden=vm.runInContext('roleButton(state.players[1],0)',c);assert.doesNotMatch(hidden,/role-portrait/);assert.match(hidden,/card-back/);c.fixture.known[`${g.players[1].id}:0`]={type:'crooked'};assert.match(vm.runInContext('roleButton(state.players[1],0)',c),/role-crooked/);delete c.fixture.known[`${g.players[1].id}:0`];assert.doesNotMatch(vm.runInContext('roleButton(state.players[1],0)',c),/role-crooked/);});
test('accepted investigation feedback respects the user reduced-motion preference',()=>{const {c,nodes}=app();let calls=0;nodes.set('#card-1-0',{animate(){calls++;}});c.window.matchMedia=()=>({matches:true});vm.runInContext('animateAccepted({type:"actionInvestigate",target:1,slot:0})',c);assert.equal(calls,0);c.window.matchMedia=()=>({matches:false});vm.runInContext('animateAccepted({type:"actionInvestigate",target:1,slot:0})',c);assert.equal(calls,1);});
