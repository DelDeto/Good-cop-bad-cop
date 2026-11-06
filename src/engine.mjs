// Điệp Viên Số Dách Online: server-authoritative game engine.
// Original UI/text; no proprietary artwork used.
const rand = (n)=>{if(n<=1)return 0;const limit=Math.floor(0x100000000/n)*n;const a=new Uint32Array(1);do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;};
const uid = ()=>crypto.randomUUID();
const shuffle = (a)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=rand(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;};
const labels = {honest:'Điệp viên',crooked:'Mafia',agent:'Đặc vụ',kingpin:'Trùm Mafia'};
export const EQUIPMENT = [
 ['vest','Áo Chống Đạn','Phòng thủ','Phản ứng khi bạn bị bắn: chặn phát bắn nhắm vào mình.'],
 ['planted','Bằng Chứng Giả','Thân phận','Đảo cách tính phe của bài thường ở một người cho đến hết ván.'],
 ['smoke','Bom Khói','Chiến thuật','Đảo chiều thứ tự lượt chơi.'],
 ['coffee','Cà Phê','Chiến thuật','Trong lượt người khác: bạn đi ngay sau khi lượt họ kết thúc.'],
 ['camera','Camera Theo Dõi','Điều tra','Công khai lá danh tính vừa được điều tra.'],
 ['disguise','Cải Trang','Phòng thủ','Bảo vệ một người khỏi bị điều tra đến hết ván.'],
 ['taser','Chích Điện','Súng','Chỉ lượt mình: lấy súng của người khác, không được bắn ngay.'],
 ['k9','Chó Nghiệp Vụ','Súng','Buộc một người đang giữ súng phải bỏ súng.'],
 ['medkit','Hộp Cấp Cứu','Hồi phục','Bỏ một dấu bị thương của Đặc vụ hoặc Trùm Mafia.'],
 ['serum','Huyết Thanh Nói Thật','Điều tra','Mục tiêu tự chọn một lá đang úp để lật công khai.'],
 ['shield','Khiên Chống Bạo Động','Phòng thủ','Chuyển phát bắn sang người sống bên cạnh nạn nhân.'],
 ['restrain','Lệnh Cách Ly','Súng','Khi bắn: bắt người bắn đổi mục tiêu.'],
 ['walkie','Máy Bộ Đàm','Súng','Tất cả người có súng chuyển hướng ngắm một mục tiêu.'],
 ['wiretap','Máy Nghe Lén','Điều tra','Điều tra mỗi người trong hai người khác nhau.'],
 ['polygraph','Máy Phát Hiện Nói Dối','Điều tra','Hai người xem toàn bộ danh tính còn úp của nhau.'],
 ['wire','Nghe Lén','Điều tra','Theo dõi một người, cùng điều tra khi người đó điều tra.'],
 ['blackmail','Thư Nặc Danh','Thân phận','Hoán đổi một thẻ thân phận giữa hai người khác mình.'],
 ['bribe','Tiền Bẩn','Thân phận','Điều tra, rồi có thể đổi bài thường được xem với một bài của mình.'],
 ['confiscation','Tịch Thu','Súng','Chuyển một khẩu súng sang người khác chưa có súng, không phải bạn.'],
 ['evidence','Tịch Thu Tang Chứng','Trang bị','Lấy trang bị của một người khác về tay mình (theo bản Việt hóa).'],
 ['database','Truy Cập Dữ Liệu Cơ Sở','Điều tra','Chỉ lượt mình: điều tra mỗi người chưa lật lá nào.'],
 ['defib','Máy Khử Rung Tim','Hồi phục','Hồi sinh một người chơi thường đã bị loại.'],
 ['metal','Máy Dò Kim Loại','Điều tra','Điều tra một lá ở mỗi người đang cầm súng.'],
].map(([id,name,category,description])=>({id,name,category,description}));
const eqMap = Object.fromEntries(EQUIPMENT.map(x=>[x.id,x]));
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
function pushLog(g,msg){g.log.push({at:Date.now(),msg});g.log=g.log.slice(-65);}
function nextAlive(g,i){const n=g.players.length;for(let d=1;d<=n;d++){let j=(i+d*g.direction+n*n)%n;if(g.players[j]?.alive)return j;}return i;}
function leftRightAlive(g,i){const n=g.players.length;const nearest=(d)=>{for(let k=1;k<n;k++){let j=(i+d*k+n*n)%n;if(g.players[j].alive)return j;}return null;};return [...new Set([nearest(-1),nearest(1)])].filter(x=>x!==null);}
function target(g,index){const p=g.players[Number(index)];assert(Number.isInteger(Number(index)) && p && p.alive,'Mục tiêu không hợp lệ hoặc đã bị loại.');return p;}
function slotCard(p,slot,requireHidden=false){const idx=Number(slot);assert(slot!==null&&slot!==''&&typeof slot!=='boolean','Vị trí lá bài không hợp lệ.');assert(Number.isInteger(idx)&&idx>=0&&idx<3,'Vị trí lá bài không hợp lệ.');const c=p.cards[idx];assert(c,'Không tìm thấy lá bài.');if(requireHidden)assert(!c.revealed,'Lá bài này đã lật.');return c;}
const hidden=p=>p.cards.map((c,i)=>c.revealed?null:i).filter(x=>x!==null);
function checkWin(g){if(g.status!=='playing')return;for(const p of g.players){if(p.alive&&p.cards.some(c=>c.type==='agent')&&p.cards.some(c=>c.type==='kingpin')){g.status='finished';g.winner=`${p.name} thắng một mình vì có cả Đặc vụ và Trùm Mafia!`;pushLog(g,`🏆 ${g.winner}`);return;}}const agent=g.players.some(p=>p.alive&&p.cards.some(c=>c.type==='agent'));const kingpin=g.players.some(p=>p.alive&&p.cards.some(c=>c.type==='kingpin'));if(!kingpin||!agent){g.status='finished';g.winner=!kingpin?'Phe Điệp viên thắng — Trùm Mafia đã bị loại!':'Phe Mafia thắng — Đặc vụ đã bị loại!';pushLog(g,`🏆 ${g.winner}`);}}
function remember(g,viewer,victim,slot){const card=slotCard(victim,slot,true);viewer.known[`${victim.id}:${slot}`]={type:card.type,cardId:card.id};viewer.privateLog.push(`Bạn xem lá ${Number(slot)+1} của ${victim.name}: ${labels[card.type]}.`);viewer.privateLog=viewer.privateLog.slice(-25);return card;}
function investigate(g,viewer,victim,slot,source='investigate'){
 assert(!victim.effects.disguise,'Người này đang được Cải Trang bảo vệ.');
 const c=remember(g,viewer,victim,slot);
 pushLog(g,`🔎 ${viewer.name} điều tra ${victim.name} (lá ${Number(slot)+1}).`);
 if(source==='investigate'){
   g.lastInvestigate={target:g.players.indexOf(victim),slot:Number(slot),turn:g.turn};
 }
 // The watched player stores the equipment owner's id. Share exactly this result.
 const listener=g.players.find(p=>p.id===viewer.effects.wire&&p.alive&&p!==viewer);
 if(listener){remember(g,listener,victim,slot);listener.privateLog.push(`🎧 Nghe Lén: bạn đã xem lá ${Number(slot)+1} của ${victim.name}.`);}
 return c;
}
function clearKnowledge(g,...affected){const ids=affected.map(p=>p.id);for(const p of g.players){for(const key of Object.keys(p.known))if(ids.some(id=>key.startsWith(id+':')))delete p.known[key];}}
function equipDraw(g,p){if(!g.deck.length){g.deck=shuffle(g.discard.splice(0));}if(g.deck.length)p.hand.push(g.deck.shift());}
function playCard(g,p,cmd){assert(p.hand.length===1,'Bạn cần giữ đúng một trang bị trên tay để sử dụng.');const id=p.hand[0];assert(eqMap[id],'Trang bị không xác định.');const self=g.players.indexOf(p);const who=(x)=>target(g,x);const slot=cmd.slot;const shot=g.pending?.kind==='shot';
 const otherTurn=g.turn!==self;
 const onlyOwn=['taser','database'];if(onlyOwn.includes(id))assert(!otherTurn,'Trang bị này chỉ được sử dụng trong lượt của bạn.');
 if(id==='coffee')assert(otherTurn&&g.phase!=='lobby'&&!shot,'Cà Phê chỉ dùng trong lượt người khác, không dùng giữa lúc xử lý phát bắn.');
 if(id==='vest')assert(shot&&g.pending.victim===self,'Áo Chống Đạn chỉ dùng khi bạn đang bị bắn.');
 if(['shield','restrain'].includes(id))assert(shot,'Trang bị này chỉ sử dụng khi đang có phát bắn.');
 if(id==='camera')assert(g.lastInvestigate&&g.lastInvestigate.turn===g.turn,'Camera chỉ dùng ngay sau một hành động điều tra.');
 if(shot&&['serum','blackmail','bribe','polygraph','wiretap','database','metal'].includes(id))throw Error('Trong bản thử nghiệm, hãy dùng lá này ngoài cửa sổ phản ứng bắn.');
 if(g.pending&&g.pending.kind!=='shot')throw Error('Vui lòng hoàn tất lựa chọn đang chờ trước khi dùng trang bị.');
 let a, b, c, gunHolder;
 switch(id){
 case 'vest':break;
 case 'planted':a=who(cmd.target);assert(!a.effects.planted,'Mục tiêu đã chịu hiệu ứng Bằng Chứng Giả.');a.effects.planted=true;break;
 case 'smoke':break;
 case 'coffee':assert(g.coffeeNext===null,'Đã có hiệu ứng Cà Phê chờ xử lý.');break;
 case 'camera':a=g.players[g.lastInvestigate.target];assert(!a.cards[g.lastInvestigate.slot].revealed,'Lá vừa điều tra đã lật công khai.');break;
 case 'disguise':a=who(cmd.target);assert(!a.effects.disguise,'Mục tiêu đã được Cải Trang.');break;
 case 'taser':assert(!p.gun,'Bạn đã có súng.');a=who(cmd.target);assert(a.gun,'Mục tiêu không giữ súng.');break;
 case 'k9':a=who(cmd.target);assert(a.gun,'Mục tiêu không có súng.');break;
 case 'medkit':a=who(cmd.target);assert(a.wounded&&a.cards.some(c=>c.type==='agent'||c.type==='kingpin'),'Mục tiêu không phải thủ lĩnh đang bị thương.');break;
 case 'serum':a=who(cmd.target);assert(hidden(a).length,'Mục tiêu không còn lá úp.');break;
 case 'shield':a=who(cmd.target);assert(leftRightAlive(g,g.pending.victim).includes(g.players.indexOf(a)),'Chọn người sống bên cạnh nạn nhân.');break;
 case 'restrain':a=who(cmd.target);assert(g.players.indexOf(a)!==g.pending.shooter&&g.players.indexOf(a)!==g.pending.victim,'Phải đổi sang người khác đang sống.');break;
 case 'walkie':a=who(cmd.target);break;
 case 'wiretap':a=who(cmd.target);b=who(cmd.target2);assert(a!==b&&a!==p&&b!==p,'Chọn hai người khác nhau, không phải bạn.');slotCard(a,slot,true);slotCard(b,cmd.slot2,true);assert(!a.effects.disguise&&!b.effects.disguise,'Không thể điều tra người được Cải Trang.');break;
 case 'polygraph':a=who(cmd.target);assert(a!==p&&!a.effects.disguise&&!p.effects.disguise,'Không thể kiểm tra mục tiêu này.');break;
 case 'wire':a=who(cmd.target);assert(!a.effects.wire,'Đã có thiết bị Nghe Lén trên người này.');break;
 case 'blackmail':a=who(cmd.target);b=who(cmd.target2);assert(a!==b&&a!==p&&b!==p,'Chọn hai người khác nhau và không phải mình.');slotCard(a,slot);slotCard(b,cmd.slot2);break;
 case 'bribe':assert(cmd.ownSlot===undefined,'Hãy điều tra trước rồi mới quyết định đổi.');a=who(cmd.target);assert(a!==p&&!a.effects.disguise,'Không thể điều tra mục tiêu.');c=slotCard(a,slot,true);break;
 case 'confiscation':a=who(cmd.target);b=who(cmd.target2);assert(a.gun&&a!==b&&!b.gun&&b!==p,'Chọn người có súng và người nhận hợp lệ (không phải bạn).');break;
 case 'evidence':a=who(cmd.target);assert(a!==p&&a.hand.length===1,'Mục tiêu không có trang bị trên tay.');break;
 case 'database':break;
 case 'defib':a=g.players[Number(cmd.target)];assert(a&&!a.alive&&!a.cards.some(c=>c.type==='agent'||c.type==='kingpin')&&a!==p,'Chỉ hồi sinh người thường đã bị loại, không phải chính mình.');break;
 case 'metal':break;
 }
 p.hand.pop();pushLog(g,`🃏 ${p.name} sử dụng ${eqMap[id].name}.`);
 if(['planted','disguise','wire'].includes(id)){g.activeCards.push({id,owner:self,target:g.players.indexOf(a)});}else{g.discard.push(id);}
 switch(id){
 case 'vest':g.pending.cancelled=true;resolveShot(g);break;
 case 'planted':a.effects.planted=true;break;
 case 'smoke':g.direction*=-1;break;
 case 'coffee':g.coffeeNext=self;break;
 case 'camera':a.cards[g.lastInvestigate.slot].revealed=true;pushLog(g,`📹 Lá ${g.lastInvestigate.slot+1} của ${a.name} được lật công khai.`);g.lastInvestigate=null;break;
 case 'disguise':a.effects.disguise=true;break;
 case 'taser':a.gun=false;a.aim=null;p.gun=true;p.aim=null;p.gunFresh=true;if(shot&&g.pending.shooter===g.players.indexOf(a)){cancelShot(g);}break;
 case 'k9':a.gun=false;a.aim=null;if(shot&&g.pending.shooter===g.players.indexOf(a)){cancelShot(g);}break;
 case 'medkit':a.wounded=false;break;
 case 'serum':g.pending={kind:'serum',target:g.players.indexOf(a)};break;
 case 'shield':g.pending.victim=g.players.indexOf(a);g.pending.passes=[g.pending.shooter];g.pending.since=Date.now();pushLog(g,`🛡️ Phát bắn chuyển sang ${a.name}.`);break;
 case 'restrain':g.pending.victim=g.players.indexOf(a);g.pending.passes=[g.pending.shooter];g.pending.since=Date.now();pushLog(g,`🚫 Người bắn phải chuyển mục tiêu sang ${a.name}.`);break;
 case 'walkie':for(const holder of g.players){if(holder.alive&&holder.gun&&holder!==a)holder.aim=g.players.indexOf(a);}break;
 case 'wiretap':investigate(g,p,a,slot,'equip');investigate(g,p,b,cmd.slot2,'equip');break;
 case 'polygraph':for(let i=0;i<3;i++){if(!a.cards[i].revealed)remember(g,p,a,i);if(!p.cards[i].revealed)remember(g,a,p,i);}break;
 case 'wire':a.effects.wire=p.id;break;
 case 'blackmail':{const i=Number(slot),j=Number(cmd.slot2);[a.cards[i],b.cards[j]]=[b.cards[j],a.cards[i]];clearKnowledge(g,a,b);checkWin(g);break;}
 case 'bribe':{investigate(g,p,a,slot,'equip');g.pending={kind:'bribe',owner:self,target:g.players.indexOf(a),slot:Number(slot),cardId:c.id,decisionId:uid()};break;}
 case 'confiscation':a.gun=false;a.aim=null;b.gun=true;b.aim=null;b.gunFresh=true;if(shot&&g.pending.shooter===g.players.indexOf(a))cancelShot(g);break;
 case 'evidence':p.hand.push(a.hand.shift());break;
 case 'database':for(const q of g.players.filter(q=>q.alive&&!q.cards.some(c=>c.revealed)&&q!==p&&!q.effects.disguise)){const h=hidden(q);if(h.length)investigate(g,p,q,h[0],'equip');}break;
 case 'defib':a.alive=true;a.wounded=false;break;
 case 'metal':for(const q of g.players.filter(q=>q.alive&&q.gun&&q!==p&&!q.effects.disguise)){const h=hidden(q);if(h.length)investigate(g,p,q,h[0],'equip');}break;
 }
}
function cancelShot(g){const shooter=g.players[g.pending.shooter];g.pending=null;g.phase='aim';pushLog(g,`✋ Phát bắn của ${shooter.name} bị ngăn vì không còn súng.`);}
function resolveShot(g){const pend=g.pending;assert(pend?.kind==='shot','Không có phát bắn đang chờ.');const shooter=g.players[pend.shooter],victim=g.players[pend.victim];shooter.gun=false;shooter.aim=null;g.pending=null;g.phase='aim';if(pend.cancelled){pushLog(g,`🛡️ ${victim.name} được Áo Chống Đạn cứu.`);return;}victim.cards.forEach(c=>c.revealed=true);if(victim.cards.some(c=>['agent','kingpin'].includes(c.type))&&!victim.wounded){victim.wounded=true;equipDraw(g,victim);if(victim.hand.length>1){const first=victim.hand.shift();g.discard.push(first);}pushLog(g,`💥 ${victim.name} bị thương lần đầu và rút trang bị.`);}else{victim.alive=false;victim.gun=false;victim.aim=null;victim.hand.splice(0).forEach(c=>g.discard.push(c));pushLog(g,`☠️ ${victim.name} đã bị loại khỏi ván.`);checkWin(g);}}
export function createRoom(code,ownerName,token){return {code,createdAt:Date.now(),ownerToken:token,status:'lobby',players:[blankPlayer(ownerName,token)],log:[],privateLogs:{},deck:[],discard:[],activeCards:[],turn:0,phase:'lobby',direction:1,gunTotal:0,coffeeNext:null,pending:null,lastInvestigate:null,round:0,winner:null};}
function blankPlayer(name,token){return {id:uid(),name:name.slice(0,24),token,bot:false,botLevel:'normal',alive:true,gun:false,aim:null,gunFresh:false,cards:[],hand:[],known:{},privateLog:[],wounded:false,effects:{}};}
export function joinRoom(g,name,token){const old=g.players.find(p=>p.token===token);if(old)return old;assert(g.status==='lobby','Ván đã bắt đầu. Chỉ người chơi cũ được vào lại.');assert(g.players.length<8,'Phòng đã đủ 8 người.');assert(name&&typeof name==='string','Vui lòng nhập tên.');const p=blankPlayer(name,token);g.players.push(p);pushLog(g,`👤 ${p.name} tham gia phòng.`);return p;}
export function setBots(g,token,count,level='normal'){
 assert(token===g.ownerToken,'Chỉ chủ phòng được thiết lập bot.');
 assert(g.status==='lobby','Chỉ thêm bot trong phòng chờ.');
 assert(Number.isInteger(count)&&count>=0&&count<=7,'Số bot phải từ 0 đến 7.');
 assert(['normal','hard'].includes(level),'Độ khó không hợp lệ.');
 g.players=g.players.filter(p=>!p.bot);
 assert(g.players.length+count<=8,'Tổng số người và bot không được vượt quá 8.');
 const names=['Bóng Đêm','Mật Mã','Hồ Ly','Bão Tố','Mắt Ưng','Vô Diện','Ảo Ảnh'];
 for(let i=0;i<count;i++){const p=blankPlayer(`BOT ${i+1} · ${names[i]}`,`bot:${uid()}`);p.bot=true;p.botLevel=level;g.players.push(p);}
 pushLog(g,`🤖 Đã cài đặt ${count} bot (${level==='hard'?'Khó':'Thường'}).`);
}
export function startGame(g,token){assert(token===g.ownerToken,'Chỉ chủ phòng được bắt đầu.');assert(g.players.length>=4&&g.players.length<=8,'Cần từ 4 đến 8 người chơi.');const n=g.players.length;g.status='playing';g.phase='action';g.turn=0;g.direction=1;g.winner=null;g.round=1;g.coffeeNext=null;g.pending=null;g.log=[];g.lastInvestigate=null;g.gunTotal=n>=7?4:n>=5?3:2;g.activeCards=[];
 const deck=shuffle(EQUIPMENT.map(x=>x.id));g.discard=[];
 // 1 Agent and 1 Kingpin dealt to separate random players, then two more cards for everyone.
 const leaderSeats=shuffle([...Array(n).keys()]).slice(0,2);
 const roles=Array(n).fill(null).map(()=>[]);roles[leaderSeats[0]].push('agent');roles[leaderSeats[1]].push('kingpin');
 const normalSlots=3*n-2;const honestCount=Math.ceil(normalSlots/2);const crookedCount=normalSlots-honestCount;
 const pool=shuffle([...Array(honestCount).fill('honest'),...Array(crookedCount).fill('crooked')]);
 for(let i=0;i<n;i++)while(roles[i].length<3)roles[i].push(pool.pop());
 for(let i=0;i<n;i++){const p=g.players[i];p.cards=shuffle(roles[i]).map(type=>({id:uid(),type,revealed:false}));p.alive=true;p.gun=false;p.aim=null;p.gunFresh=false;p.known={};p.privateLog=[];p.wounded=false;p.effects={};p.hand=[deck.pop()];}
 g.deck=deck;pushLog(g,`🎬 Ván đấu bắt đầu (${n} người). Đến lượt ${g.players[0].name}.`);
}
export function command(g,token,cmd){const actor=g.players.find(p=>p.token===token);assert(actor&&!actor.bot,'Người chơi không hợp lệ.');return executeCommand(g,token,cmd);}
function executeCommand(g,token,cmd){const p=g.players.find(p=>p.token===token);assert(p,'Không tìm thấy người chơi.');assert(cmd&&typeof cmd.type==='string','Lệnh không hợp lệ.');if(cmd.type==='setBots'){setBots(g,token,Number(cmd.count),cmd.level||'normal');return;}
 if(g.pending?.kind==='bribe'&& !['resolveBribe','chat'].includes(cmd.type))throw Error('Vui lòng hoàn tất Tiền Bẩn.');
 if(cmd.type==='start'||cmd.type==='restart'){startGame(g,token);return;}
 if(cmd.type==='chat'){const message=String(cmd.message||'').trim().slice(0,200);assert(message,'Nội dung trống.');pushLog(g,`💬 ${p.name}: ${message}`);return;}
 assert(g.status==='playing','Chưa bắt đầu hoặc ván đã kết thúc.');assert(p.alive,'Bạn đã bị loại.');const seat=g.players.indexOf(p),isTurn=seat===g.turn;
 if(cmd.type==='resolveBribe'){
  const pend=g.pending;
  assert(pend?.kind==='bribe'&&pend.owner===seat&&cmd.decisionId===pend.decisionId,'Lựa chọn Tiền Bẩn không hợp lệ.');
  assert(typeof cmd.swap==='boolean','Lựa chọn Tiền Bẩn không hợp lệ.');
  const victim=g.players[pend.target],card=victim.cards[pend.slot];
  assert(card.id===pend.cardId,'Lá bài đang chờ đã thay đổi.');
  if(cmd.swap){
   assert(['honest','crooked'].includes(card.type),'Không thể đổi lá đã điều tra.');
   const own=slotCard(p,cmd.ownSlot),j=Number(cmd.ownSlot);
   [victim.cards[pend.slot],p.cards[j]]=[own,card];
   clearKnowledge(g,victim,p);
   // The investigator still knows the card they gave away; other memories expire.
   p.known[`${victim.id}:${pend.slot}`]={type:own.type,cardId:own.id};
   pushLog(g,`💵 ${p.name} hoàn tất hoán đổi Tiền Bẩn.`);
  }
  g.pending=null;checkWin(g);return;
 }
 if(cmd.type==='playEquipment'){playCard(g,p,cmd);return;}
 if(cmd.type==='passShot'){assert(g.pending?.kind==='shot','Không có phát bắn đang chờ.');if(!g.pending.passes.includes(seat))g.pending.passes.push(seat);if(g.players.filter(q=>q.alive).every(q=>g.pending.passes.includes(g.players.indexOf(q))))resolveShot(g);return;}
 if(cmd.type==='forceShot'){assert(isTurn&&g.pending?.kind==='shot','Chỉ người bắn có thể xử lý.');assert(Date.now()-g.pending.since>=15000,'Chưa đủ 15 giây để xác nhận phát bắn.');resolveShot(g);return;}
 if(g.pending?.kind==='serum'){assert(seat===g.pending.target&&cmd.type==='serumReveal','Mục tiêu Huyết Thanh phải chọn một lá để lật.');const c=slotCard(p,cmd.slot,true);c.revealed=true;g.pending=null;pushLog(g,`🧪 ${p.name} phải lật lá ${Number(cmd.slot)+1}: ${labels[c.type]}.`);return;}
 assert(isTurn,'Chưa đến lượt bạn.');if(g.pending){
  if(g.pending.kind==='reveal'){assert(cmd.type==='chooseReveal','Bạn phải lật một lá danh tính của mình.');const card=slotCard(p,cmd.slot,true);card.revealed=true;g.pending=null;g.phase='aim';pushLog(g,`🔓 ${p.name} lật lá ${Number(cmd.slot)+1}: ${labels[card.type]}.`);return;}
  if(g.pending.kind==='discard'){assert(cmd.type==='discardHand','Bạn cần bỏ một lá trang bị.');const index=Number(cmd.index);assert(index>=0&&index<p.hand.length,'Trang bị không hợp lệ.');g.discard.push(p.hand.splice(index,1)[0]);g.pending=null;if(hidden(p).length)g.pending={kind:'reveal'};else g.phase='aim';return;}
  throw Error('Đang chờ xử lý phản ứng trước khi tiếp tục.');
 }
 if(g.phase==='action'){
  if(cmd.type==='actionInvestigate'){const q=target(g,cmd.target);assert(q!==p,'Hành động điều tra phải nhắm vào người chơi khác.');investigate(g,p,q,cmd.slot);g.phase='aim';return;}
  if(cmd.type==='actionArm'){assert(!p.gun,'Bạn đã có súng.');assert(g.players.filter(q=>q.gun).length<g.gunTotal,'Không còn súng ở giữa bàn.');p.gun=true;p.aim=null;p.gunFresh=true;g.phase='aim';pushLog(g,`🔫 ${p.name} lấy súng.`);if(hidden(p).length)g.pending={kind:'reveal'};return;}
  if(cmd.type==='actionEquip'){equipDraw(g,p);g.phase='aim';pushLog(g,`🎒 ${p.name} lấy trang bị.`);if(p.hand.length>1)g.pending={kind:'discard'};else if(hidden(p).length)g.pending={kind:'reveal'};return;}
  if(cmd.type==='actionShoot'){assert(p.gun&&p.aim!==null,'Bạn cần có súng và ngắm mục tiêu trước khi bắn.');assert(!p.gunFresh,'Bạn không thể bắn ngay lượt lấy súng.');target(g,p.aim);g.pending={kind:'shot',shooter:seat,victim:p.aim,passes:[seat],since:Date.now(),cancelled:false};pushLog(g,`🎯 ${p.name} tuyên bố bắn ${g.players[p.aim].name}. Cửa sổ phản ứng mở.`);return;}
  throw Error('Hãy chọn hành động chính trong lượt.');
 }
 if(g.phase==='aim'){
  if(cmd.type==='chooseAim'){assert(p.gun,'Bạn chưa có súng.');const q=target(g,cmd.target);assert(q!==p,'Không được tự ngắm chính mình.');p.aim=g.players.indexOf(q);pushLog(g,`🎯 ${p.name} đang ngắm ${q.name}.`);return;}
  if(cmd.type==='endTurn'){assert(!p.gun||p.aim!==null,'Bạn cần ngắm mục tiêu trước khi kết thúc lượt.');p.gunFresh=false;const next=g.coffeeNext!==null?g.coffeeNext:nextAlive(g,seat);g.coffeeNext=null;g.turn=next;g.phase='action';g.round++;g.lastInvestigate=null;pushLog(g,`➡️ Đến lượt ${g.players[next].name}.`);return;}
 }
 throw Error('Hành động không hợp lệ ở giai đoạn hiện tại.');
}
function allegiance(p){
 if(p.cards.some(c=>c.type==='agent')&&p.cards.some(c=>c.type==='kingpin'))return 'solo';
 if(p.cards.some(c=>c.type==='agent'))return 'honest';
 if(p.cards.some(c=>c.type==='kingpin'))return 'crooked';
 let a=0,b=0;for(const c of p.cards){let v=c.type;if(p.effects.planted)v=v==='honest'?'crooked':v==='crooked'?'honest':v;if(v==='honest')a++;if(v==='crooked')b++;}return a>b?'honest':'crooked';
}
function pendingView(g,seat){
 const p=g.pending;if(!p)return null;
 if(p.kind==='bribe')return {kind:p.kind,owner:p.owner,...(p.owner===seat?{target:p.target,slot:p.slot,decisionId:p.decisionId,canSwap:['honest','crooked'].includes(g.players[p.target].cards[p.slot].type)}:{})};
 if(p.kind==='shot')return {kind:p.kind,shooter:p.shooter,victim:p.victim,passes:[...p.passes],since:p.since,deadline:shotDeadline(g),forceAt:p.since+15000};
 return {kind:p.kind,...(p.target!==undefined?{target:p.target}:{})};
}
export function view(g,token){const me=g.players.find(p=>p.token===token);assert(me,'Không có quyền truy cập phòng.');const seat=g.players.indexOf(me);return {code:g.code,status:g.status,phase:g.phase,turn:g.turn,round:g.round,direction:g.direction,winner:g.winner,gunTotal:g.gunTotal,gunsFree:Math.max(0,g.gunTotal-g.players.filter(p=>p.gun).length),isOwner:token===g.ownerToken,me:seat,myTeam:me.cards.length?allegiance(me):null,hand:me.hand.map(id=>eqMap[id]),myCards:me.cards.map(c=>({type:c.type,name:labels[c.type],revealed:c.revealed})),known:me.known,privateLog:me.privateLog.slice(-12),pending:pendingView(g,seat),coffeeNext:g.coffeeNext,players:g.players.map((p,i)=>({seat:i,id:p.id,name:p.name,bot:!!p.bot,alive:p.alive,gun:p.gun,aim:p.aim,gunFresh:p.gunFresh,wounded:p.wounded,handCount:p.hand.length,effects:p.effects,cards:p.cards.map(c=>({type:c.revealed?c.type:null,shown:c.revealed})),isYou:i===seat})),log:g.log.slice(-35),equipmentCount:g.deck.length};}

// Bots act exclusively on server state. The client never receives their unrevealed cards or memories.
const choose = xs=>xs.length?xs[rand(xs.length)]:null;
const isLeader=p=>p.cards.some(c=>['agent','kingpin'].includes(c.type));
function botScore(g,bot,person){
 if(person===bot||!person.alive)return -999;
 const team=allegiance(bot),signals=[];
 for(let i=0;i<3;i++){
   let c=person.cards[i];
   if(c.revealed)signals.push(c.type);
   else {const k=bot.known[`${person.id}:${i}`];if(k?.cardId===c.id)signals.push(k.type);}
 }
 let score=0;
 for(const t of signals){
   if(t==='agent')score+=team==='honest'?-9:team==='crooked'?14:5;
   if(t==='kingpin')score+=team==='crooked'?-9:team==='honest'?14:5;
   if(t==='honest')score+=team==='honest'?-1.8:team==='crooked'?1.8:0.5;
   if(t==='crooked')score+=team==='crooked'?-1.8:team==='honest'?1.8:0.5;
 }
 if(person.gun&&person.aim===g.players.indexOf(bot))score+=2;
 if(person.wounded&&signals.some(x=>x==='agent'||x==='kingpin'))score+=3;
 return score;
}
function botCandidates(g,bot){return g.players.map((p,i)=>({p,i,score:botScore(g,bot,p)})).filter(x=>x.p!==bot&&x.p.alive);}
function botInvestigation(g,bot){const opportunities=[];for(const {p,i,score} of botCandidates(g,bot)){
  if(p.effects.disguise)continue;
  for(const slot of hidden(p)){
    const memory=bot.known[`${p.id}:${slot}`];if(memory?.cardId===p.cards[slot].id)continue;
    opportunities.push({target:i,slot,priority:(p.gun?1.5:0)+Math.abs(score)*.15+(p.cards.some(c=>c.revealed)?0.4:0)+rand(100)/500});
  }
 }
 return opportunities.sort((a,b)=>b.priority-a.priority)[0]||null;
}
function botAim(g,bot){const list=botCandidates(g,bot).sort((a,b)=>b.score-a.score);if(!list.length)return null;
 if(list[0].score>=2)return list[0].i;
 const pool=list.filter(x=>x.score>=-1);return choose(pool.length?pool:list)?.i??null;
}
function botEquipment(g,bot){if(bot.hand.length!==1)return null;const id=bot.hand[0],self=g.players.indexOf(bot),candidates=botCandidates(g,bot),unknown=candidates.filter(x=>!x.p.effects.disguise&&hidden(x.p).length);
 const armed=candidates.filter(x=>x.p.gun).sort((a,b)=>b.score-a.score);
 if(id==='medkit'){const target=g.players.map((p,i)=>({p,i})).filter(x=>x.p.alive&&x.p.wounded&&botScore(g,bot,x.p)<0).sort((a,b)=>(a.p===bot?-1:0));if(target.length)return {type:'playEquipment',target:target[0].i};}
 if(id==='database'&&g.turn===self&&candidates.filter(x=>!x.p.cards.some(c=>c.revealed)&&!x.p.effects.disguise).length>=2)return {type:'playEquipment'};
 if(id==='metal'&&armed.length)return {type:'playEquipment'};
 if(id==='k9'&&armed[0]?.score>0)return {type:'playEquipment',target:armed[0].i};
 if(id==='taser'&&g.turn===self&&!bot.gun&&armed[0]?.score>=0)return {type:'playEquipment',target:armed[0].i};
 if(id==='walkie'&&armed.length>=2){const enemy=candidates.sort((a,b)=>b.score-a.score)[0];if(enemy&&enemy.score>2)return {type:'playEquipment',target:enemy.i};}
 if(id==='polygraph'&&unknown.length){const t=unknown.sort((a,b)=>b.score-a.score)[0];if(t&&!bot.effects.disguise)return {type:'playEquipment',target:t.i};}
 if(id==='serum'&&unknown.length){const t=choose(unknown);return {type:'playEquipment',target:t.i};}
 if(id==='wiretap'&&unknown.length>=2){return {type:'playEquipment',target:unknown[0].i,slot:hidden(unknown[0].p)[0],target2:unknown[1].i,slot2:hidden(unknown[1].p)[0]};}
 if(id==='wire'&&candidates.length){const t=candidates.filter(x=>!x.p.effects.wire).sort((a,b)=>b.score-a.score)[0];if(t)return {type:'playEquipment',target:t.i};}
 if(id==='evidence'){const t=candidates.filter(x=>x.p.hand.length).sort((a,b)=>b.score-a.score)[0];if(t)return {type:'playEquipment',target:t.i};}
 if(id==='defib'){const t=g.players.map((p,i)=>({p,i})).find(x=>!x.p.alive&&x.p!==bot&&x.p.cards.every(c=>!c.revealed||!['agent','kingpin'].includes(c.type)));if(t)return {type:'playEquipment',target:t.i};}
 if(id==='disguise'&&!bot.effects.disguise&&isLeader(bot))return {type:'playEquipment',target:self};
 if(id==='planted'){const t=candidates.filter(x=>!x.p.effects.planted).sort((a,b)=>b.score-a.score)[0];if(t&&t.score>0)return {type:'playEquipment',target:t.i};}
 if(id==='bribe'&&unknown.length){const t=unknown[0];return {type:'playEquipment',target:t.i,slot:hidden(t.p)[0]};}
 if(id==='confiscation'){const source=armed[0],dest=candidates.find(x=>!x.p.gun&&x.p!==source?.p&&botScore(g,bot,x.p)<0);if(source&&source.score>0&&dest)return {type:'playEquipment',target:source.i,target2:dest.i};}
 if(id==='smoke'&&rand(10)===0)return {type:'playEquipment'};
 return null;
}
function botShotReaction(g,bot){const pend=g.pending;if(pend?.kind!=='shot')return null;
 const self=g.players.indexOf(bot),victim=g.players[pend.victim],shooter=g.players[pend.shooter];
 if(pend.passes.includes(self))return null;
 const ownScore=botScore(g,bot,victim),enemyShot=botScore(g,bot,shooter);
 if(victim===bot&&bot.hand[0]==='vest')return {type:'playEquipment'};
 if(bot.hand[0]==='shield'&&(victim===bot||ownScore<0)){
   const neighbors=leftRightAlive(g,pend.victim).map(i=>({i,score:botScore(g,bot,g.players[i])})).filter(x=>x.i!==pend.shooter).sort((a,b)=>b.score-a.score);
   if(neighbors[0]&&neighbors[0].score>ownScore+1)return {type:'playEquipment',target:neighbors[0].i};
 }
 if(bot.hand[0]==='restrain'&&(victim===bot||ownScore<-2)){
   const options=botCandidates(g,bot).filter(x=>x.i!==pend.victim&&x.i!==pend.shooter).sort((a,b)=>b.score-a.score);
   if(options[0]&&options[0].score>ownScore+1)return {type:'playEquipment',target:options[0].i};
 }
 if(bot.hand[0]==='k9'&&shooter!==bot&&(victim===bot||ownScore<-2)&&shooter.gun)return {type:'playEquipment',target:pend.shooter};
 return {type:'passShot'};
}
export function needsBotStep(g){if(g.status!=='playing'||!g.players.some(p=>p.bot))return false;
 if(g.pending?.kind==='shot')return g.players.some((p,i)=>p.bot&&p.alive&&!g.pending.passes.includes(i));
 if(g.pending?.kind==='bribe')return !!g.players[g.pending.owner]?.bot;
 if(g.pending?.kind==='serum')return !!g.players[g.pending.target]?.bot;
 return !!g.players[g.turn]?.bot;
}
export function botStep(g){if(!needsBotStep(g))return false;
 let bot,move;
 if(g.pending?.kind==='shot'){
  bot=g.players.find((p,i)=>p.bot&&p.alive&&!g.pending.passes.includes(i));move=botShotReaction(g,bot);
 }else if(g.pending?.kind==='bribe'){
  bot=g.players[g.pending.owner];move={type:'resolveBribe',decisionId:g.pending.decisionId,swap:false};
 }else if(g.pending?.kind==='serum'){
  bot=g.players[g.pending.target];move={type:'serumReveal',slot:choose(hidden(bot))};
 }else{
  bot=g.players[g.turn];const self=g.turn;
  if(g.pending?.kind==='reveal'){
   const options=hidden(bot);move={type:'chooseReveal',slot:choose(options.filter(i=>!['agent','kingpin'].includes(bot.cards[i].type)).length?options.filter(i=>!['agent','kingpin'].includes(bot.cards[i].type)):options)};
  }else if(g.pending?.kind==='discard'){
   move={type:'discardHand',index:bot.hand.findIndex(id=>['smoke','coffee','wire','planted'].includes(id))>=0?bot.hand.findIndex(id=>['smoke','coffee','wire','planted'].includes(id)):0};
  }else if(g.phase==='aim'){
   const aim=bot.gun?botAim(g,bot):null;
   const current=bot.aim===null?-999:botScore(g,bot,g.players[bot.aim]);
   const suggested=aim===null?-999:botScore(g,bot,g.players[aim]);
   move=bot.gun&&aim!==null&&(bot.aim===null||(current < -2 && suggested>current+2))?{type:'chooseAim',target:aim}:{type:'endTurn'};
  }else if(g.phase==='action'){
   const canEquip=botEquipment(g,bot);
   if(canEquip&&rand(5)!==0)move=canEquip;
   else if(bot.gun&&!bot.gunFresh&&bot.aim!==null){
     const current=botScore(g,bot,g.players[bot.aim]);
     move=current>=1.5||(current>=-1&&rand(bot.botLevel==='hard'?3:5)===0)?{type:'actionShoot'}:null;
   }
   if(!move){const inv=botInvestigation(g,bot);const gunsFree=g.players.filter(p=>p.gun).length<g.gunTotal;
     if(inv&&(!gunsFree||bot.gun||rand(bot.botLevel==='hard'?4:3)!==0))move={type:'actionInvestigate',target:inv.target,slot:inv.slot};
     else if(gunsFree&&!bot.gun)move={type:'actionArm'};
     else if(inv)move={type:'actionInvestigate',target:inv.target,slot:inv.slot};
     else if(!bot.gun&&g.deck.length)move={type:'actionEquip'};
     else move={type:'actionEquip'};
   }
  }
 }
 if(!bot||!move)return false;
 try{executeCommand(g,bot.token,move);return true;}
 catch(e){
   pushLog(g,`🤖 ${bot.name} chuyển phương án: ${String(e.message).slice(0,65)}`);
   // An invalid optional equipment never blocks the bot from taking a main action.
   if(g.pending?.kind==='shot'){
     try{executeCommand(g,bot.token,{type:'passShot'});return true;}catch{}
   }
   if(g.phase==='action'&&g.pending===null&&g.turn===g.players.indexOf(bot)){
      const inv=botInvestigation(g,bot);
      try{executeCommand(g,bot.token,inv?{type:'actionInvestigate',target:inv.target,slot:inv.slot}:{type:'actionEquip'});return true;}catch{}
   }
   return false;
 }
}

// Solo/bot rooms automatically close a shot reaction window after 20 seconds.
export function shotDeadline(g){return g.status==='playing'&&g.players.some(p=>p.bot)&&g.pending?.kind==='shot'?g.pending.since+20000:null;}
export function resolveTimedShot(g){const until=shotDeadline(g);if(until===null||Date.now()<until)return false;resolveShot(g);return true;}
