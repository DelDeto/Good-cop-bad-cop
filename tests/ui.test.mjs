import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {createRoom,setBots,startGame,view} from '../src/engine.mjs';
function appFixture(){
 const elements=new Map();
 for(const id of ['#root','#modal','#toast'])elements.set(id,{innerHTML:'',addEventListener(){},classList:{add(){},remove(){}}});
 const document={querySelector:s=>elements.get(s)||null};
 const context=vm.createContext({document,window:{},location:{search:''},localStorage:{getItem(){return null},setItem(){},removeItem(){}},URLSearchParams,console,FormData,fetch(){throw Error('network disabled')},setTimeout,clearTimeout});
 const src=fs.readFileSync(new URL('../public/app.js',import.meta.url),'utf-8');
 vm.runInContext(src,context);
 return {context,root:elements.get('#root'),modal:elements.get('#modal')};
}
test('board first UI offers all clickable pieces, 3 role cards and item art',()=>{
 const g=createRoom('D10A22','Người chơi','owner');setBots(g,'owner',3,'hard');startGame(g,'owner');
 const {context,root}=appFixture();context.fixture=view(g,'owner');
 vm.runInContext('state=fixture;render();',context);
 assert.match(root.innerHTML,/ONLINE V1\.5/);
 assert.equal((root.innerHTML.match(/data-pick-card="/g)||[]).length,12);
 assert.equal((root.innerHTML.match(/data-own-card="/g)||[]).length,3);
 assert.equal((root.innerHTML.match(/data-board-item="/g)||[]).length,2);
 assert.match(root.innerHTML,/data-eqcard-index="0"/);
 assert.match(root.innerHTML,/Chạm trực tiếp trên bàn/);
 assert.match(root.innerHTML,/data-select-person="/);
});
test('reveal pending highlights own card, aim phase allows target click',()=>{
 const g=createRoom('D10A22','Người chơi','owner');setBots(g,'owner',3);startGame(g,'owner');
 g.players[0].gun=true;g.phase='aim';g.pending={kind:'reveal'};
 const {context,root}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();',context);
 assert.match(root.innerHTML,/Chạm một lá danh tính của bạn để lật công khai/);
 assert.match(root.innerHTML,/secret physical-card/);
 g.pending=null;context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();',context);
 assert.match(root.innerHTML,/KẾT THÚC LƯỢT/);
});

test('clicking an opponent card opens an investigate confirmation',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');
 const {context,modal}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();handleCardClick(1,0);',context);
 assert.match(modal.innerHTML,/Điều tra lá bài/);assert.match(modal.innerHTML,/Xác nhận/);
});
test('equipment target selection is dispatched as server validated command',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');
 g.players[0].hand=['medkit'];g.players[1].wounded=true;
 const {context,root}=appFixture();context.fixture=view(g,'owner');
 vm.runInContext('state=fixture;render();send=(x)=>{lastSent=x};activateEquipment(0);handleSeatClick(1);',context);
 const dispatched=vm.runInContext('lastSent',context);
 assert.equal(dispatched.type,'playEquipment');assert.equal(dispatched.target,1);
 assert.match(root.innerHTML,/Hộp Cấp Cứu/);
});
