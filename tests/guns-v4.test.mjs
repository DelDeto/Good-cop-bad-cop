import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,startGame,command,view,setBots} from '../src/engine.mjs';
const game=n=>{const g=createRoom('GUNV04','Người 0','gun-token-0');for(let i=1;i<n;i++)joinRoom(g,'Người '+i,'gun-token-'+i);startGame(g,'gun-token-0');return g;};
test('Luật súng phiên bản 4: số súng bằng số người chơi (4–8)',()=>{
 for(let n=4;n<=8;n++){const g=game(n);assert.equal(g.gunTotal,n);for(let i=0;i<n;i++){const s=view(g,'gun-token-'+i);assert.equal(s.gunTotal,n);assert.equal(s.gunsFree,n);assert.equal(s.players.length,n);}}
});
test('Mỗi người có thể lấy một súng, không được lấy súng thứ hai, trả súng sau khi bắn',()=>{
 for(let n=4;n<=8;n++){
  const g=game(n);
  for(let i=0;i<n;i++){
   const token='gun-token-'+i;
   assert.equal(g.turn,i);
   command(g,token,{type:'actionArm'});
   assert.equal(g.pending?.kind,'reveal');
   command(g,token,{type:'chooseReveal',slot:0});
   command(g,token,{type:'chooseAim',target:(i+1)%n});
   command(g,token,{type:'endTurn'});
   assert.equal(g.players.filter(p=>p.gun).length,i+1);
   assert.equal(view(g,token).gunsFree,n-i-1);
  }
  assert.equal(view(g,'gun-token-0').gunsFree,0);
  assert.throws(()=>command(g,'gun-token-0',{type:'actionArm'}),/đã có súng/i);
  command(g,'gun-token-0',{type:'actionShoot'});
  for(let i=1;i<n;i++)command(g,'gun-token-'+i,{type:'passShot'});
  assert.equal(g.players[0].gun,false);
  assert.equal(view(g,'gun-token-0').gunsFree,1);
  assert.equal(g.gunTotal,n);
 }
});
test('Chơi với BOT vẫn cấp số súng theo tổng số ghế, không theo số người thật',()=>{
 for(let bots=3;bots<=7;bots++){
  const g=createRoom('BOTGUN','Người chơi','human-token');
  setBots(g,'human-token',bots,'hard');startGame(g,'human-token');
  assert.equal(g.players.length,bots+1);assert.equal(g.gunTotal,bots+1);
  assert.equal(view(g,'human-token').gunsFree,bots+1);
 }
});
test('Không tự ý đổi số súng của một ván đang chơi khi đọc trạng thái',()=>{
 const g=game(8);g.gunTotal=4;
 assert.equal(view(g,'gun-token-0').gunTotal,4);
 assert.equal(g.gunTotal,4);
});
