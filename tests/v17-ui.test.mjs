import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {fixture} from './helpers/fixtures.mjs';
import {view} from '../src/engine.mjs';
function app(){const nodes=new Map();for(const id of ['#root','#modal','#toast'])nodes.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});const c=vm.createContext({document:{querySelector:s=>nodes.get(s)||null},window:{},location:{search:''},localStorage:{getItem(){return null}},URLSearchParams,FormData,console,setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf8'),c);return{c,nodes};}
test('all 4–8-seat viewer-relative plans are distinct and keep the viewer at bottom',()=>{const {c}=app();for(let n=4;n<=8;n++)for(let me=0;me<n;me++){const positions=[];for(let seat=0;seat<n;seat++){const p=vm.runInContext(`seatPosition(${seat},${me},${n})`,c);assert.equal(p.relative,(seat-me+n)%n);if(seat===me)assert.equal(p.y,100);else assert.ok(p.y<100);positions.push([p.x,p.y].join(':'));}assert.equal(new Set(positions).size,n);}});
test('one own card set, private/public visibility, and stale memory drops the old identity',()=>{
 const g=fixture(),{c,nodes}=app();c.fixture=view(g,g.ownerToken);const key=`${g.players[1].id}:1`;c.fixture.known[key]={type:'crooked',cardId:'test-card'};vm.runInContext('state=fixture;render();',c);
 assert.equal((nodes.get('#root').innerHTML.match(/data-own-card=/g)||[]).length,3);assert.equal((nodes.get('#root').innerHTML.match(/data-pick-card=/g)||[]).length,12);
 assert.equal(vm.runInContext('memoryHTML().split("</section>")[1].includes("MAFIA")',c),true);delete c.fixture.known[key];vm.runInContext('render();',c);assert.equal(vm.runInContext('memoryHTML().split("</section>")[1].includes("MAFIA")',c),false);assert.equal(vm.runInContext('memoryHTML().includes("hết hiệu lực")',c),true);
});
test('unrelated public log and shot pass updates preserve a valid first equipment target',()=>{
 const g=fixture();g.players[0].hand=['wiretap'];const {c}=app();c.fixture=view(g,g.ownerToken);vm.runInContext('state=fixture;render();activateEquipment(0);handleCardClick(1,0);state.log.push({msg:"hello"});render();',c);assert.equal(vm.runInContext('pick.selected',c),1);
 c.fixture.pending={kind:'shot',shooter:1,victim:2,passes:[1],since:1};c.fixture.hand=[{id:'confiscation',name:'Tịch thu'}];vm.runInContext('render();pick={kind:"equipment",id:"confiscation",selected:1};state.pending.passes.push(3);render();',c);assert.equal(vm.runInContext('pick.selected',c),1);
});
test('unexpected equipment loss cancels local selection and confirmation',()=>{
 const g=fixture();g.players[0].hand=['wiretap'];const {c,nodes}=app();c.fixture=view(g,g.ownerToken);vm.runInContext('state=fixture;render();activateEquipment(0);handleCardClick(1,0);handleCardClick(2,0);state.hand=[];render();',c);assert.equal(vm.runInContext('pick',c),null);assert.equal(nodes.get('#modal')._callback,null);
});
test('renderer never consumes opponent tokens or unrevealed role values from outside view()',()=>{
 const g=fixture(),{c,nodes}=app();c.fixture=view(g,g.players[1].token);vm.runInContext('state=fixture;render();',c);const html=nodes.get('#root').innerHTML;for(const p of g.players)assert.ok(!html.includes(p.token));assert.ok(!html.includes('ĐẶC VỤ'));assert.ok(!html.includes('TRÙM MAFIA'));
});
test('sending chat does not clear a valid two-target equipment selection',async()=>{
 const g=fixture();g.players[0].hand=['wiretap'];const {c}=app();c.fixture=view(g,g.ownerToken);c.fetch=async()=>({ok:true,json:async()=>({state:c.fixture})});vm.runInContext('state=fixture;session={code:state.code,token:"test"};render();activateEquipment(0);handleCardClick(1,0);',c);await vm.runInContext('send({type:"chat",message:"hello"})',c);assert.equal(vm.runInContext('pick.selected',c),1);
});
test('V1.7 release version and generated assets agree with Worker health metadata',async()=>{
 const {loadWorker}=await import('./helpers/worker.mjs');const {default:worker}=await loadWorker();const r=await worker.fetch(new Request('https://test.local/api/health'),{});const health=await r.json();const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));assert.ok(health.version.startsWith(pkg.version));assert.match(fs.readFileSync(new URL('../public/index.html',import.meta.url),'utf8'),new RegExp('v='+pkg.version.replaceAll('.','\\.')));
 for(const [source,target] of [['app.js','app.txt'],['style.css','style.txt'],['index.html','index.txt']])assert.equal(fs.readFileSync(new URL('../public/'+source,import.meta.url),'utf8'),fs.readFileSync(new URL('../assets/'+target,import.meta.url),'utf8'));
});
