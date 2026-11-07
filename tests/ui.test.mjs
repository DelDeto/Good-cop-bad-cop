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
 assert.match(root.innerHTML,/ONLINE V1\.8/);
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
 const {context,root,modal}=appFixture();context.fixture=view(g,'owner');
 vm.runInContext('state=fixture;render();send=(x)=>{lastSent=x};activateEquipment(0);handleSeatClick(1);',context);
 assert.equal(vm.runInContext('typeof lastSent',context),'undefined');modal._callback();
 const dispatched=vm.runInContext('lastSent',context);
 assert.equal(dispatched.type,'playEquipment');assert.equal(dispatched.target,1);
 assert.match(root.innerHTML,/Hộp Cấp Cứu/);
});

test('Bribe card-first flow sends investigation before own-card choice, including decline and reconnect',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');g.players[0].hand=['bribe'];
 const {context,root,modal:equipmentModal}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();send=x=>lastSent=x;activateEquipment(0);handleCardClick(1,2);',context);
 assert.equal(vm.runInContext('typeof lastSent',context),'undefined');equipmentModal._callback();
 const sent=vm.runInContext('lastSent',context);assert.equal(sent.type,'playEquipment');assert.equal(sent.target,1);assert.equal(sent.slot,2);assert.equal(sent.ownSlot,undefined);
 context.fixture.pending={kind:'bribe',owner:0,target:1,slot:2,decisionId:'choice',canSwap:true};context.fixture.known[`${g.players[1].id}:2`]={type:'honest'};
 vm.runInContext('state=fixture;render();',context);assert.match(root.innerHTML,/declineBribe/);assert.match(root.innerHTML,/Tiền Bẩn: ĐIỆP VIÊN/);
 assert.equal(vm.runInContext('interactionState()',context),'EQUIPMENT_SECOND_TARGET');
 vm.runInContext('handleOwnCard(0);',context);const cb=vm.runInContext("document.querySelector('#modal')._callback",context);cb();
 assert.equal(vm.runInContext('lastSent.type',context),'resolveBribe');assert.equal(vm.runInContext('lastSent.decisionId',context),'choice');
});
test('explicit interaction states recover selections on server change and keep optional equipment cancellation local',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');g.players[0].hand=['wiretap'];
 const {context}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();activateEquipment(0);',context);assert.equal(vm.runInContext('interactionState()',context),'EQUIPMENT_TARGET');
 vm.runInContext('handleCardClick(1,0);',context);assert.equal(vm.runInContext('interactionState()',context),'EQUIPMENT_SECOND_TARGET');
 vm.runInContext('pick=null;render();',context);assert.equal(context.fixture.hand.length,1);assert.equal(vm.runInContext('interactionState()',context),'SELECT_CARD');
 vm.runInContext('activateEquipment(0);state.phase="aim";render();',context);assert.equal(vm.runInContext('pick',context),null);assert.equal(vm.runInContext('interactionState()',context),'TURN_COMPLETE');
 vm.runInContext('state.players[0].gun=true;',context);assert.equal(vm.runInContext('interactionState()',context),'CHOOSE_AIM');
 vm.runInContext('busy=true;',context);assert.equal(vm.runInContext('interactionState()',context),'RESOLVING');
});
test('reaction table shows public shooter/victim, deadline and only viewer defensive equipment',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');g.players[0].hand=['vest'];g.pending={kind:'shot',shooter:1,victim:0,passes:[1],since:Date.now()};
 const {context,root}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();',context);
 assert.match(root.innerHTML,/reaction-table/);assert.match(root.innerHTML,/data-countdown/);assert.match(root.innerHTML,/reaction-ready/);assert.match(root.innerHTML,/shot-shooter/);assert.equal(vm.runInContext('interactionState()',context),'REACTION_WINDOW');
 context.fixture.hand=[{id:'bribe',name:'Tiền Bẩn',category:'Thân phận',description:'Điều tra'}];vm.runInContext('render();',context);assert.doesNotMatch(root.innerHTML,/reaction-ready/);
});

test('shoot fallback is unavailable for a dead/missing aim; living retarget remains interactive',()=>{
 const g=createRoom('BEE777','Player','owner');setBots(g,'owner',3);startGame(g,'owner');g.players[0].gun=true;g.players[0].aim=1;g.players[1].alive=false;
 const {context,root,modal}=appFixture();context.fixture=view(g,'owner');vm.runInContext('state=fixture;render();send=x=>lastSent=x;chooseTurn("shoot");handleSeatClick(1);',context);
 assert.doesNotMatch(root.innerHTML,/data-act="shoot"/);assert.doesNotMatch(modal.innerHTML,/Xác nhận nổ súng/);assert.match(modal.innerHTML,/Đã bị loại/);modal._callback();assert.equal(vm.runInContext('typeof lastSent',context),'undefined');assert.equal(vm.runInContext('canShoot()',context),false);
 vm.runInContext('state.phase="aim";send=x=>lastSent=x;handleSeatClick(2);',context);assert.equal(vm.runInContext('lastSent.type',context),'chooseAim');
 vm.runInContext('state.phase="action";state.players[0].aim=2;render();',context);assert.match(root.innerHTML,/data-act="shoot"/);vm.runInContext('clearTimeout(window._toast);',context);
});
