const $=(s)=>document.querySelector(s);const root=$('#root');let state=null,session=null,stream=null,busy=false;
const esc=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label={honest:'ĐIỆP VIÊN',crooked:'MAFIA',agent:'ĐẶC VỤ',kingpin:'TRÙM MAFIA'};
const symbol={honest:'✦',crooked:'✘',agent:'★',kingpin:'♛'};
const buttons=(text,fn,css='')=>`<button class="btn ${css}" data-act="${fn}">${text}</button>`;
const icon={gun:'🔫',spy:'🔎',hand:'🎒',shot:'🎯'};
const INTERACTION_STATES=Object.freeze(['IDLE','SELECT_CARD','SELECT_PLAYER','CHOOSE_AIM','CONFIRM_SHOT','EQUIPMENT_TARGET','EQUIPMENT_SECOND_TARGET','REACTION_WINDOW','RESOLVING','TURN_COMPLETE']);
let confirmation=null,interactionContext=null;
function interactionState(){
 if(busy)return 'RESOLVING';
 if(state?.status==='finished')return 'TURN_COMPLETE';
 if(state?.pending?.kind==='shot')return 'REACTION_WINDOW';
 if(state?.pending?.kind==='bribe')return state.pending.owner===state.me?'EQUIPMENT_SECOND_TARGET':'RESOLVING';
 if(confirmation==='shot')return 'CONFIRM_SHOT';
 if(pick?.kind==='equipment')return pick.selected===undefined?'EQUIPMENT_TARGET':'EQUIPMENT_SECOND_TARGET';
 if(confirmation)return confirmation;
 if(state?.pending?.kind==='serum'&&state.pending.target===state.me)return 'SELECT_CARD';
 if(!state||state.status!=='playing'||state.turn!==state.me)return 'IDLE';
 if(['reveal','discard','serum'].includes(state.pending?.kind))return 'SELECT_CARD';
 if(state.phase==='aim')return state.players[state.me].gun?'CHOOSE_AIM':'TURN_COMPLETE';
 return 'SELECT_CARD';
}
function validReaction(eq){
 const p=state.pending;if(p?.kind!=='shot')return false;
 if(eq.id==='vest')return p.victim===state.me;
 if(eq.id==='shield')return aliveNeighbors(p.victim).length>0;
 if(eq.id==='restrain')return state.players.some(q=>q.alive&&q.seat!==p.victim&&q.seat!==p.shooter);
 if(eq.id==='k9')return state.players[p.shooter].gun;
 return false;
}
function reactionBanner(){
 const p=state.pending;if(p?.kind!=='shot')return '';
 return `<div class="reaction-table" role="status"><b>🎯 ${esc(state.players[p.shooter].name)} → ${esc(state.players[p.victim].name)}</b><br>Phản ứng: ${state.hand.filter(validReaction).map(eq=>esc(eq.name)).join(' · ')||'Có thể bỏ qua / chờ người khác'}<br>${p.deadline?`Tự xử lý sau <strong data-countdown="${p.deadline}">${Math.max(0,Math.ceil((p.deadline-Date.now())/1000))}</strong> giây`:'Không có hạn tự động'} · Người bắn xác nhận sau <span data-countdown="${p.forceAt||p.since+15000}">${Math.max(0,Math.ceil(((p.forceAt||p.since+15000)-Date.now())/1000))}</span> giây</div>`;
}
let pick=null; let hoverTimer=null; let dragged=null;
const physicalArt={vest:0,planted:1,smoke:2,coffee:3,camera:4,disguise:5,taser:6,k9:7,medkit:8,serum:9,shield:10,restrain:11,walkie:12,wiretap:13,polygraph:14,wire:15,blackmail:16,bribe:17,confiscation:18,evidence:19,database:20,defib:21,metal:22};

const equipmentArt={vest:'🛡',planted:'🗂',smoke:'◉',coffee:'☕',camera:'◈',disguise:'♟',taser:'ϟ',k9:'♞',medkit:'✚',serum:'⚗',shield:'▱',restrain:'⛓',walkie:'▣',wiretap:'⌁',polygraph:'≋',wire:'◌',blackmail:'✉',bribe:'＄',confiscation:'⌖',evidence:'▤',database:'▦',defib:'✚',metal:'◎'};
const agentAvatar=(p)=>`<svg viewBox="0 0 72 72" fill="none" role="img" aria-label="Ảnh đại diện mật vụ"><circle cx="36" cy="36" r="34" fill="${p.bot?'#31394b':'#51392c'}"/><path d="M12 66c4-15 16-22 24-22S56 51 60 66" fill="${p.bot?'#555d6b':'#76604c'}"/><path d="M26 46l10 8 10-8-5 20H31z" fill="#c6bca7"/><path d="M28 48l8 5 8-5-7 16h-3z" fill="#303037"/><path d="M24 29c0-13 5-18 12-18s12 5 12 18v5c0 10-5 18-12 18s-12-8-12-18z" fill="#d7ae82"/><path d="M25 32c8 3 15 3 23 0M23 34h26" stroke="#2f2825" stroke-width="4"/><path d="M20 26h32l-3-7H23z" fill="#1a2027"/><path d="M13 26h46v5H13z" fill="#1b232a"/><path d="M30 41h12" stroke="#5e392c" stroke-width="2"/><path d="M25 29h22" stroke="#b79b6c" stroke-width="1.5"/></svg>`;
const roleArt=(kind)=>`<svg class="role-portrait-svg" viewBox="0 0 120 100" aria-hidden="true"><circle cx="60" cy="45" r="39" fill="${kind==='crooked'||kind==='kingpin'?'#bd8271':'#8299bb'}" opacity=".26"/><path d="M12 96Q20 68 49 64L58 79L68 64Q96 66 107 96Z" fill="#161924" stroke="#d4bf93" stroke-width="2"/><path d="M44 68L59 85L75 67" fill="none" stroke="#d7c7a9" stroke-width="4"/><path d="M57 80L62 93L68 80L62 71Z" fill="#8d2f2a"/><path d="M39 40Q38 19 60 18Q82 19 81 41L78 56Q64 72 48 58Z" fill="#d4b087" stroke="#382a29" stroke-width="2"/><path d="M43 47H57M64 47H77" stroke="#221f22" stroke-width="5"/><path d="M34 34L82 34L77 17H40Z" fill="#1f2630" stroke="#e4cda4" stroke-width="2"/><path d="M28 34H88" stroke="#1b2228" stroke-width="7"/><path d="M${kind==='kingpin'?75:77} 57l${kind==='kingpin'?30:10} 5" stroke="#d2aa77" stroke-width="3"/>${kind==='agent'?'<path d="M92 12l4 8 9 1-6 6 2 9-9-5-8 5 1-9-6-6 9-1z" fill="#e9c47c"/>':''}</svg>`;
const cardSeal=(type)=>type==='agent'?'★':type==='kingpin'?'♛':type==='honest'?'✦':'✕';
const notif=(message)=>{const el=$('#toast');el.innerHTML=`<div class="toast">${esc(message)}</div>`;clearTimeout(window._toast);window._toast=setTimeout(()=>el.innerHTML='',3500);};
const api=async(url,data)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Lỗi máy chủ');return j;};
const codeFromURL=()=>new URLSearchParams(location.search).get('room')?.toUpperCase();
function navbar(suffix='HỒ SƠ BÍ MẬT'){return `<header class="topbar"><div class="brand"><div class="mark">✪</div><div><h1>Điệp Viên <span>Số Dách</span></h1><small>GOOD COP · BAD COP <b>ONLINE V1.5</b></small></div></div><div class="topnote"><span class="live-dot"></span>${esc(suffix)}<br><small>HỒ SƠ MẬT · 23 TRANG BỊ</small></div></header>`;}

function home(){root.innerHTML=navbar()+`<main class="home"><section><span class="eyebrow">MULTIPLAYER / HIDDEN IDENTITY</span><h2>AI LÀ <span>ĐỒNG MINH</span><br>AI LÀ KẺ <span>PHẢN BỘI?</span></h2><p>Thẩm vấn, lật thân phận, chơi trang bị và truy tìm thủ lĩnh đối phương. Mỗi người chơi trên thiết bị của mình, mọi bí mật được giữ trên máy chủ.</p><div class="hero-cards" aria-hidden="true"><div class="showcase-card cop"><span>ĐIỆP VIÊN</span><strong>✦</strong><small>TRUNG THÀNH</small></div><div class="showcase-card gear"><span>TRANG BỊ</span><strong>⚗</strong><small>HỒ SƠ TỐI MẬT</small></div><div class="showcase-card mafia"><span>MAFIA</span><strong>♛</strong><small>TRÙM CUỐI</small></div></div><div class="features"><span>◉ 4–8 người</span><span>◉ 23 trang bị</span><span>◉ Trình duyệt PC / Mobile</span><span>◉ Chơi với bot AI</span><span>◉ Đồng bộ phòng chơi</span></div></section><section class="box formbox"><h3>Đăng nhập vào cuộc điều tra</h3><div class="field"><label>Tên mật vụ</label><input id="name" maxlength="24" placeholder="Ví dụ: Ghế 03 · Đức" autocomplete="nickname" value="${esc(localStorage.getItem('sd-name')||'')}"></div><div class="solobox"><div class="eyebrow">CHẾ ĐỘ 01 · CHƠI VỚI BOT</div><div class="botselects"><div class="field"><label>Số BOT</label><select id="soloCount"><option value="3">3 BOT (bàn 4 người)</option><option value="4">4 BOT (bàn 5 người)</option><option value="5">5 BOT (bàn 6 người)</option><option value="6">6 BOT (bàn 7 người)</option><option value="7">7 BOT (bàn 8 người)</option></select></div><div class="field"><label>Độ khó</label><select id="soloLevel"><option value="normal">Thường</option><option value="hard">Khó</option></select></div></div><button class="btn primary wide" data-act="solo">🤖 CHƠI NGAY VỚI BOT · SOLO MODE</button><p class="tiny muted" style="margin:8px 0 0">Bot tự điều tra, ngắm, bắn và phản ứng; mỗi lượt có độ trễ để dễ theo dõi.</p></div><hr class="hr"><button class="btn wide" data-act="create">+ Tạo phòng với bạn bè · MULTIPLAYER</button><hr class="hr"><div class="field"><label>Mã phòng 6 ký tự</label><input id="code" maxlength="6" placeholder="VD: B4A8CD" class="mono" value="${esc(codeFromURL()||'')}"></div><button class="btn wide" data-act="join">↗ Tham gia phòng</button><p class="tiny muted">Không cần tài khoản. Phòng tự hết hạn sau 24 giờ.</p></section></main><div class="footer">FAN-MADE PROTOTYPE • GIAO DIỆN NGUYÊN BẢN • KHÔNG SỬ DỤNG TRANH MINH HỌA CÓ BẢN QUYỀN</div>`;}
async function connect(){if(stream){stream.close();stream=null;}if(!session)return;let {code,token}=session;try{const j=await fetch(`/api/state?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`).then(r=>r.json());if(j.error)throw Error(j.error);state=j;render();stream=new EventSource(`/api/events?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);stream.onmessage=e=>{try{state=JSON.parse(e.data);render();}catch(err){console.error(err)}};stream.onerror=()=>{};}catch(err){localStorage.removeItem('sd-'+code);session=null;home();notif('Không thể kết nối: '+err.message);}}
async function newRoom(kind){try{const name=$('#name')?.value.trim();if(!name)throw Error('Vui lòng nhập tên.');localStorage.setItem('sd-name',name);let result;if(kind==='create'||kind==='solo')result=await api('/api/create',{name});else{const code=$('#code')?.value.trim().toUpperCase();if(code.length!==6)throw Error('Mã phòng phải có 6 ký tự.');result=await api('/api/join',{name,code});}
 if(kind==='solo'){
   const count=Number($('#soloCount').value),level=$('#soloLevel').value;
   await api('/api/command',{...result,command:{type:'setBots',count,level}});
   await api('/api/command',{...result,command:{type:'start'}});
 }
 session=result;localStorage.setItem('sd-'+result.code,result.token);history.replaceState(null,'',`?room=${result.code}`);connect();
 }catch(err){notif(err.message);}}

async function send(command){if(!session||busy)return;busy=true;render();try{const r=await api('/api/command',{code:session.code,token:session.token,command});state=r.state;pick=null;render();}catch(err){pick=null;confirmation=null;notif(err.message);try{const fresh=await fetch(`/api/state?code=${encodeURIComponent(session.code)}&token=${encodeURIComponent(session.token)}`).then(r=>r.json());if(!fresh.error)state=fresh;}catch{notif('Mất kết nối. Đang chờ đồng bộ lại.');}}finally{busy=false;render();}}
function seatBox(p,idx=0){
 const total=state.players.length,upper=Math.ceil(total/2),row=idx<upper?1:3,colIndex=idx<upper?idx:idx-upper;
 const count=row===1?upper:total-upper;
 const cols=count===1?[2]:count===2?[1,4]:count===3?[1,2,4]:[1,2,3,4];const col=cols[Math.min(colIndex,cols.length-1)];
 const cards=(p.cards.length?p.cards:[{},{},{}]).map((c,i)=>{
 const own=state.me===p.seat?state.myCards[i]:null;const known=state.known[`${p.id}:${i}`];const v=own?.type||c.type||known?.type||null;
 const showed=own||c.shown||known;const team=v==='honest'||v==='agent'?'cop':v?'mafia':'unknown';
 return `<button type="button" data-pick-card="${p.seat}:${i}" aria-label="Ghế ${p.seat+1}, lá ${i+1}: ${esc(showed?(label[v]||'Danh tính đã biết'):'Chưa biết')}" title="${esc(own?'Bài của bạn':c.shown?'Đã công khai':known?'Bạn đã điều tra lá này':'Chạm để điều tra')}" class="mini physical-mini ${showed?'face':'card-back'} ${team} ${known&&!c.shown&&!own?'known':''} ${eligibleCard(p.seat,i)?'tappable':''}"><span class="mini-watermark">${showed?cardSeal(v):'◎'}</span><span class="mini-caption">${showed?esc(label[v]||'ĐÃ LẬT'):'MẬT'}</span></button>`;
 }).join('');
 const target=p.gun?state.players[p.aim]:null;
 return `<article style="--seat-col:${col};--seat-row:${row}" data-pick-seat="${p.seat}" role="group" class="player ${p.isYou?'you':''} ${p.seat===state.turn&&state.status==='playing'?'active':''} ${!p.alive?'dead':''} ${p.bot?'npc':''} ${eligibleSeat(p.seat)?'targetable':''} ${state.pending?.kind==='shot'&&state.pending.victim===p.seat?'shot-victim':''} ${state.pending?.kind==='shot'&&state.pending.shooter===p.seat?'shot-shooter':''}">
 <div class="playerhead"><span class="seat">GHẾ ${String(p.seat+1).padStart(2,'0')} ${p.isYou?'· BẠN':''}</span><span class="seat ${p.seat===state.turn?'playing':''}">${p.seat===state.turn?'● ĐANG ĐI':''}</span></div>
 <div class="player-inner"><div class="avatar" data-select-person="${p.seat}" role="button" tabindex="0" aria-label="Chọn ${esc(p.name)}">${agentAvatar(p)}${p.bot?'<span class="avatar-tag">BOT</span>':''}</div><div class="player-data"><div class="playername" data-select-person="${p.seat}" role="button" tabindex="0">${esc(p.name)}${p.bot?'<span class="botbadge">AI</span>':''}</div><div class="mini-cards">${cards}</div></div></div>
 <div class="armstrip">${p.gun?`<span class="armed" data-drag-gun="${p.seat}" draggable="${p.isYou}">⌖ SÚNG → ${esc(target?.name||'ĐANG NGẮM')}</span>`:''}${p.wounded?'<span class="injury">✚ BỊ THƯƠNG</span>':''}${!p.alive?'<span class="injury">☠ ĐÃ LOẠI</span>':''}${!p.gun&&!p.wounded&&p.alive?'<span class="on-watch">◉ ĐANG THEO DÕI</span>':''}</div></article>`;
}

function lobby(){const spots=Array.from({length:8},(_,i)=>state.players[i]?`<div class="lobbyseat"><small>GHẾ ${String(i+1).padStart(2,'0')}</small><strong>${esc(state.players[i].name)} ${state.players[i].bot?'🤖':''}</strong><div class="my-info">${i===state.me?'✦ BẠN':state.players[i].bot?'BOT TỰ ĐỘNG':i===0?'CHỦ PHÒNG':'ĐÃ THAM GIA'}</div></div>`:`<div class="lobbyseat empty"><small>GHẾ ${String(i+1).padStart(2,'0')}</small><strong>Chưa có người</strong></div>`).join('');root.innerHTML=navbar('PHÒNG CHỜ')+`<main class="layout lobbycenter"><div class="banner"><div><div class="eyebrow">MẬT MÃ PHÒNG</div><div class="roomline"><strong class="roomcode">${esc(state.code)}</strong>${buttons('⧉ Sao chép mã','copy')}</div></div><div class="right"><span class="pill gold">${state.players.length}/8 người</span>${buttons('↗ Chia sẻ link','share','ghost')}</div></div><div class="panel"><div class="panelhead"><h3>DANH SÁCH MẬT VỤ</h3><span class="muted tiny">Cần tối thiểu 4 người</span></div><div class="panelbody"><div class="lobbyseats">${spots}</div><div class="joinhint">${state.isOwner?'Bạn là chủ phòng. Khi đủ 4 người, nhấn bắt đầu để chia bài bí mật.':'Đang chờ chủ phòng bắt đầu. Hãy chia sẻ mã để mời bạn bè.'}</div>${state.isOwner?`<div class="lobby-controls"><div class="botselects"><div class="field"><label>Thêm bot vào phòng</label><select id="lobbyBotCount">${Array.from({length:8-state.players.filter(p=>!p.bot).length},(_,i)=>`<option value="${i}" ${i===state.players.filter(p=>p.bot).length?'selected':''}>${i} bot</option>`).join('')}</select></div><div class="field"><label>Độ khó bot</label><select id="lobbyBotLevel"><option value="normal">Thường</option><option value="hard">Khó</option></select></div></div>${buttons('Cập nhật bot','setBots','wide')}${buttons('▶ BẮT ĐẦU ĐIỀU TRA','start','primary wide')}</div>`:''}</div></div></main>`;}
function actions(){
  if(busy)return '<div class="hint-panel">Đang gửi lệnh và chờ máy chủ xác nhận…</div>';
  const me=state.players[state.me], own=state.turn===state.me, pend=state.pending;
  if(!me.alive) return '<div class="hint-panel">Bạn đã bị loại. Có thể quan sát phần còn lại của ván.</div>';
  if(pend?.kind==='shot')return `<div class="hint-panel danger">🔫 ${esc(state.players[pend.shooter].name)} đang bắn ${esc(state.players[pend.victim].name)}. Chạm lá trang bị để phản ứng.</div>${!pend.passes.includes(state.me)?buttons('✓ Bỏ qua phản ứng','passShot','wide'):''}${own&&state.me===pend.shooter?buttons('Hoàn tất bắn (sau 15 giây)','forceShot','ghost wide'):''}`;
  if(pend?.kind==='bribe')return pend.owner===state.me?`<div class="hint-panel gold">Tiền Bẩn: ${esc(label[state.known[`${state.players[pend.target].id}:${pend.slot}`]?.type])}. ${pend.canSwap?'Chạm lá của bạn để đổi, hoặc chỉ giữ kết quả.':'Lá thủ lĩnh: chỉ giữ kết quả điều tra.'}</div><p>Hết hạn sau <span data-countdown="${pend.deadline}">${Math.max(0,Math.ceil((pend.deadline-Date.now())/1000))}</span> giây: tự động không đổi, trang bị đã dùng.</p>${buttons('Chỉ điều tra / Không đổi','declineBribe','wide')}`:'<div class="hint-panel">Đang chờ chủ Tiền Bẩn quyết định.</div>';
  if(pend?.kind==='serum')return state.me===pend.target?'<div class="hint-panel gold">Chạm một trong ba lá danh tính của bạn để lật công khai.</div>':'<div class="hint-panel">Đang chờ mục tiêu lật bài vì Huyết Thanh Nói Thật.</div>';
  if(!own)return `<div class="hint-panel">Đang đến lượt <b>${esc(state.players[state.turn].name)}</b>. Bạn có thể sử dụng trang bị nếu luật cho phép.</div>`;
  if(pend?.kind==='discard')return '<div class="hint-panel gold">Chạm lá trang bị bạn muốn bỏ để giữ đúng một lá.</div>';
  if(pend?.kind==='reveal')return '<div class="hint-panel gold">Chạm một lá danh tính của bạn để lật công khai sau khi lấy súng/trang bị.</div>';
  if(state.phase==='action')return `<div class="hint-panel gold"><b>Chạm trực tiếp trên bàn:</b><br>① Bài úp của đối thủ → Điều tra<br>② Súng ở giữa → Lấy súng<br>③ Chồng trang bị → Rút bài<br>④ Người bạn đang ngắm → Bắn</div><details class="legacy-actions"><summary>Thao tác thay thế (hỗ trợ)</summary><div class="actions">${buttons('Điều tra','investigate')}${buttons('Lấy súng','arm')}${buttons('Rút trang bị','equip')}${me.gun?buttons('Bắn','shoot','danger'):''}</div></details>`;
  if(state.phase==='aim')return `<div class="hint-panel gold">${me.gun?'Chạm avatar đối thủ để ngắm / đổi mục tiêu.':'Đã xong hành động chính.'} Nhấn “Kết thúc lượt” khi đã hoàn tất.</div>${buttons('✓ KẾT THÚC LƯỢT','endTurn','primary wide')}`;
  return '';
}

function aliveNeighbors(seat){
  const n=state.players.length,out=[];
  for(const direction of [-1,1])for(let j=1;j<n;j++){const i=(seat+direction*j+n*n)%n;if(state.players[i].alive){out.push(i);break;}}
  return [...new Set(out)];
}
function eligibleCard(seat,slot){
  if(!state||state.status!=='playing')return false;
  const p=state.players[seat],own=seat===state.me,c=p.cards[slot];
  if(state.pending?.kind==='bribe')return own&&state.pending.owner===state.me&&state.pending.canSwap;
  if(own&&(state.pending?.kind==='reveal'||state.pending?.kind==='serum'&&state.pending.target===seat))return !c.shown;
  if(pick?.kind==='equipment'&&['wiretap','blackmail','bribe'].includes(pick.id))return eligibleSeat(seat)&&(!c.shown||pick.id==='blackmail');
  return state.turn===state.me&&!state.pending&&state.phase==='action'&&!own&&p.alive&&!p.effects.disguise&&!c.shown;
}
function eligibleSeat(seat){
  if(!state||state.status!=='playing')return false;
  const q=state.players[seat],my=state.players[state.me],pend=state.pending;
  if(pick?.kind==='equipment'){
    const id=pick.id,second=pick.selected!==undefined,target=pick.selected;
    if(!q.alive&&id!=='defib')return false;
    if(id==='defib')return !q.alive&&seat!==state.me;
    if(id==='medkit')return q.wounded;
    if(['k9','taser'].includes(id))return q.gun&&(id!=='taser'||seat!==state.me);
    if(id==='evidence')return q.handCount>0&&seat!==state.me;
    if(id==='restrain')return pend?.kind==='shot'&&seat!==pend.shooter&&seat!==pend.victim;
    if(id==='shield')return pend?.kind==='shot'&&aliveNeighbors(pend.victim).includes(seat);
    if(id==='confiscation')return second?seat!==state.me&&seat!==target&&!q.gun:q.gun;
    if(['wiretap','blackmail'].includes(id))return seat!==state.me&&(!second||seat!==target)&&(!q.effects.disguise||id==='blackmail');
    if(id==='bribe')return second?seat===state.me:seat!==state.me&&!q.effects.disguise;
    if(['polygraph','serum'].includes(id))return seat!==state.me&&!q.effects.disguise&&q.cards.some(c=>!c.shown);
    if(id==='wire')return !q.effects.wire;
    if(id==='disguise')return !q.effects.disguise;
    if(id==='planted')return !q.effects.planted;
    return q.alive;
  }
  if(seat===state.me||!q.alive)return false;
  if(state.turn!==state.me||pend)return false;
  if(state.phase==='aim'&&my.gun)return true;
  if(state.phase==='action'&&my.gun&&my.aim===seat&&!my.gunFresh)return true;
  return false;
}
function interactionGuide(){
  if(busy)return '<div class="pick-banner" role="status">Đang xử lý lệnh…</div>';
  if(pick?.kind==='equipment'){
    const eq=state.hand.find(e=>e.id===pick.id);
    const id=pick.id;
    const message=(['wiretap','blackmail'].includes(id)?(pick.selected===undefined?'Chạm LÁ của người thứ nhất.':'Chạm LÁ của người thứ hai (khác người thứ nhất).'):
     id==='bribe'?'Chạm lá úp của mục tiêu để điều tra.':
     id==='confiscation'?(pick.selected===undefined?'Chạm người có súng.':'Chạm người chưa có súng để chuyển súng.'):
     'Chạm avatar của người chơi phù hợp để sử dụng trang bị.');
    return `<div class="pick-banner"><span>🃏 ĐANG DÙNG: <b>${esc(eq?.name||id)}</b><br>${esc(message)}</span><div class="pick-actions">${buttons('Hủy','cancelPick','ghost')}</div></div>`;
  }
  if(state?.pending?.kind==='shot')return `<div class="pick-banner warning"><span>⚠️ ĐANG CÓ PHÁT BẮN · Chạm trang bị phản ứng hoặc chọn “Bỏ qua”.</span></div>`;
  return `<div class="pick-banner"><span>♟ <b>CHƠI TRỰC TIẾP:</b> Chạm lá úp để điều tra · Chạm súng để lấy · Chạm trang bị để dùng · Chạm avatar để ngắm / bắn</span></div>`;
}
function renderGear(eq,i){const artIndex=physicalArt[eq.id];return `<button type="button" data-eqcard-index="${i}" draggable="true" class="equipment gear-card physical-gear ${(pick?.id===eq.id?'selected':'')} ${validReaction(eq)?'reaction-ready':''}" aria-label="Dùng trang bị ${esc(eq.name)}" title="Chạm để dùng; nhấn giữ để đọc kỹ"><div class="gear-head"><span class="eyebrow">TRANG BỊ · ${esc(eq.category)}</span><span class="gear-number">#${String(i+1).padStart(2,'0')}</span></div><div class="gear-illustration ${artIndex!==undefined?'photo-art':''}" style="${artIndex!==undefined?'--art-position:'+artIndex:''}">${artIndex===undefined?(equipmentArt[eq.id]||'▣'):''}</div><strong>${esc(eq.name)}</strong><p>${esc(eq.description)}</p><span class="card-foot">CHẠM ĐỂ KÍCH HOẠT · GCB</span></button>`;}

function board(){let me=state.players[state.me];const cards=state.myCards.map((c,i)=>`<button type="button" data-own-card="${i}" class="secret physical-card ${c.type} ${eligibleCard(state.me,i)?'tappable':''}"><small>LÁ ${i+1} ${c.revealed?'· CÔNG KHAI':'· BÍ MẬT'}</small><div class="symbol illustrated-role">${roleArt(c.type)}</div><strong>${label[c.type]}</strong><span class="card-stamp">THẺ DANH TÍNH</span></button>`).join('');const hand=state.hand[0];const log=state.log.slice().reverse().map(x=>`<p>${esc(x.msg)}</p>`).join('');const priv=state.privateLog.slice().reverse().map(x=>`<p><strong>RIÊNG BẠN:</strong> ${esc(x)}</p>`).join('');const turnPlayer=state.players[state.turn];const wins=state.status==='finished';const bots=state.players.filter(p=>p.bot).length;root.innerHTML=navbar('CHIẾN DỊCH ĐIỀU TRA')+`<main class="layout"><div class="banner noir-banner"><div><div class="eyebrow">PHÒNG ${esc(state.code)} • LƯỢT ${state.round} ${bots?'• 🤖 '+bots+' BOT':''}</div><h2>${wins?'🏆 '+esc(state.winner):`ĐẾN LƯỢT: ${esc(turnPlayer.name)}`}</h2></div><div class="right"><span class="pill ${wins?'green':state.pending?.kind==='shot'?'red':'gold'}">${wins?'KẾT THÚC':state.pending?.kind==='shot'?'ĐANG XỬ LÝ BẮN':'ĐANG CHƠI'}</span>${buttons('⧉ Mã phòng','copy','ghost')}</div></div>${interactionGuide()}<div class="gamegrid"><section class="board-wrap"><div class="board physical-board"><div class="playergrid playergrid-physical">${state.players.map((p,i)=>seatBox(p,i)).join('')}<div class="table-center">${reactionBanner()}<div class="center-label">HỒ SƠ MẬT • LƯỢT ${state.round}</div><div class="table-items"><button type="button" data-board-item="equipment" draggable="true" aria-label="Rút trang bị từ chồng bài" class="item-stack interactive-stack"><div class="stack-back back3"></div><div class="stack-back back2"></div><div class="stack-top"><div class="equ-symbol">▤</div><strong>TRANG BỊ</strong><small>${state.equipmentCount} LÁ</small></div></button><div class="center-medallion"><span>✪</span><strong>TRUY TÌM<br>TRÙM MAFIA</strong><small>TRUST NO ONE</small></div><button type="button" data-board-item="gun" draggable="true" aria-label="Lấy súng ở giữa bàn" class="gun-item interactive-stack"><div class="gun-silhouette"><svg viewBox="0 0 180 120" class="pistol-svg" aria-hidden="true"><path d="M18 51H132Q146 52 145 65L134 72L107 69L92 110L59 109L69 73L44 74L25 63Z" fill="#5a5b5b" stroke="#d2c7a5" stroke-width="4"/><path d="M26 46h115l12 10-12 8H23z" fill="#777e80" stroke="#1c2022" stroke-width="6"/><circle cx="77" cy="60" r="16" fill="#283134" stroke="#a2a39d" stroke-width="6"/><path d="M143 49h32v11h-32" fill="#899194" stroke="#1d2429" stroke-width="4"/><path d="M86 73l-10 29 13-3 17-29" fill="#4f3327" stroke="#161616" stroke-width="3"/></svg></div><strong>SÚNG</strong><small>${state.gunsFree} CÒN LẠI</small></button></div><div class="table-caption">CHẠM VẬT THỂ ĐỂ THỰC HIỆN · GIỮ BÍ MẬT · TÌM ĐỒNG MINH</div></div></div></div><div class="footer">Luật thực thi trên máy chủ • Vai trò chưa công khai chỉ hiển thị cho chủ sở hữu • Bản thử nghiệm</div></section><aside class="side"><div class="panel"><div class="panelhead"><h3>THẺ DANH TÍNH CỦA BẠN</h3><span class="pill ${me.alive?'green':'red'}">${me.alive?'CÒN SỐNG':'ĐÃ LOẠI'}</span></div><div class="panelbody"><div class="secretcards">${cards}</div><div class="my-info">Phe của bạn: <strong>${state.myTeam==='honest'?'ĐIỆP VIÊN':state.myTeam==='crooked'?'MAFIA':'CHIẾN THẮNG ĐƠN ĐỘC'}</strong></div><div class="my-info">${me.wounded?'🩸 Bạn đang có 1 dấu bị thương.':'◉ Bạn chưa bị thương.'}</div></div></div><div class="panel"><div class="panelhead"><h3>HƯỚNG DẪN LƯỢT</h3><small class="muted">${state.phase==='action'?'CHỌN 1 HÀNH ĐỘNG':state.phase==='aim'?'NGẮM / KẾT THÚC':''}</small></div><div class="panelbody">${wins?`${state.isOwner?buttons('↻ CHƠI VÁN MỚI','restart','primary wide'):''}`:actions()}</div></div><div class="panel"><div class="panelhead"><h3>TRANG BỊ</h3><span class="pill">${state.hand.length}/1</span></div><div class="panelbody">${state.hand.length?`<div class="hand-tray">${state.hand.map((eq,i)=>renderGear(eq,i)).join('')}</div>`:'<div class="empty-equipment"><span>▤</span><p>Chưa có trang bị. Hãy dùng hành động “Lấy trang bị”.</p></div>'}</div></div><div class="panel last"><div class="panelhead"><h3>NHẬT KÝ VÁN CHƠI</h3><small class="muted">${state.direction===1?'↻ Thuận chiều':'↺ Ngược chiều'}</small></div><div class="panelbody"><div class="log">${priv}${log||'<p>Chưa có sự kiện.</p>'}</div><div class="chatline"><input maxlength="200" id="chat" placeholder="Trao đổi hoặc tung tin giả..."><button class="btn" data-act="chat">Gửi</button></div></div></div></aside></div></main>`;}
function render(){
 const context=state?JSON.stringify([state.code,state.status,state.turn,state.phase,state.pending]):null;
 if(context!==interactionContext){pick=null;confirmation=null;const m=$('#modal');m.classList.add('hide');m._callback=null;interactionContext=context;}
 if(pick&&!state?.hand.some(eq=>eq.id===pick.id))pick=null;
 if(state?.pending&&!['shot'].includes(state.pending.kind))pick=null;
 if(!state){home();return;}if(state.status==='lobby')lobby();else board();root.dataset&&(root.dataset.interactionState=interactionState());}
function modal(title,fields,submitText,callback,desc=''){confirmation=confirmation||'SELECT_PLAYER';const m=$('#modal');m.classList.remove('hide');m.innerHTML=`<section class="modal"><div class="eyebrow">LỆNH TÁC CHIẾN</div><h3>${esc(title)}</h3>${desc?`<p>${esc(desc)}</p>`:''}<div id="formfields">${fields}</div><div class="modalbuttons">${buttons('Huỷ','close','ghost')}${buttons(esc(submitText),'confirm','primary')}</div></section>`;m._callback=callback;if(root.dataset)root.dataset.interactionState=interactionState();}
function field(labelText,key,opts,hasBlank=false){return `<div class="field"><label>${esc(labelText)}</label><select name="${esc(key)}">${hasBlank?'<option value="">Không đổi / không chọn</option>':''}${opts.map(({v,t})=>`<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></div>`;}
const targetOptions=(filter=()=>true)=>state.players.filter(filter).map(p=>({v:p.seat,t:`Ghế ${p.seat+1} · ${p.name}${!p.alive?' (đã loại)':''}`}));
const cardOptions=(idx,hiddenOnly=true)=>{const p=state.players[idx];if(!p)return[];return p.cards.map((c,i)=>({v:i,t:`Lá ${i+1}${c.shown?' · đã lật':' · đang úp'}`})).filter((x,i)=>!hiddenOnly||!p.cards[i].shown);};
const myCardOptions=(hiddenOnly)=>state.myCards.map((c,i)=>({v:i,t:`Lá ${i+1} — ${label[c.type]} ${c.revealed?'(đã lật)':''}`})).filter((x,i)=>!hiddenOnly||!state.myCards[i].revealed);
function choice(title,fields,cb,desc=''){modal(title,fields,'Xác nhận',()=>{const values=Object.fromEntries(new FormData($('#formfields').closest('.modal').querySelector('form')||$('#formfields')).entries());cb(values);},desc);}
function getValues(){return Object.fromEntries([...$('#formfields').querySelectorAll('[name]')].map(n=>[n.name,n.value]));}
function promptSimple(title,fields,cb,desc=''){modal(title,fields,'Xác nhận',()=>cb(getValues()),desc);}
function chooseTurn(type){const self=state.me;switch(type){
 case 'investigate':{const opts=targetOptions(p=>p.seat!==self&&p.alive&&!p.effects.disguise&&p.cards.some(c=>!c.shown));if(!opts.length)return notif('Không có mục tiêu hợp lệ.');return playerSlotPrompt('Điều tra một người',opts,v=>send({type:'actionInvestigate',...v}));}
 case 'arm':return send({type:'actionArm'});
 case 'equip':return send({type:'actionEquip'});
 case 'shoot':return confirmPlay('Xác nhận nổ súng','Các trang bị phản ứng được xử lý trước phát bắn.',()=>send({type:'actionShoot'}));
 case 'chooseAim':return simpleTarget('Chọn mục tiêu ngắm',targetOptions(p=>p.seat!==self&&p.alive),v=>send({type:'chooseAim',target:v.target}));
 case 'chooseReveal':return promptSimple('Lật một lá của bạn',field('Lá phải công khai','slot',myCardOptions(true)),v=>send({type:'chooseReveal',slot:v.slot}));
 case 'serumReveal':return promptSimple('Huyết Thanh Nói Thật',field('Chọn lá để công khai','slot',myCardOptions(true)),v=>send({type:'serumReveal',slot:v.slot}));
 case 'discardHand':return promptSimple('Giữ một trang bị',field('Chọn lá muốn bỏ','index',state.hand.map((x,i)=>({v:i,t:x.name}))),v=>send({type:'discardHand',index:v.index}));
 case 'endTurn':case 'passShot':case 'forceShot':return send({type});
 }}
function simpleTarget(title,opts,cb){if(!opts.length)return notif('Không có mục tiêu phù hợp.');promptSimple(title,field('Mục tiêu','target',opts),cb);}
function playerSlotPrompt(title,opts,cb,extra='',initial=false){const first=Number(opts[0].v);const options=cardOptions(first,true);if(!options.length)return notif('Không có lá úp hợp lệ.');const fields=field('Người bị điều tra','target',opts)+field('Chọn lá danh tính','slot',options)+extra;promptSimple(title,fields,cb);const sel=$('#formfields [name="target"]');sel.onchange=()=>{const arr=cardOptions(Number(sel.value),true);const slot=$('#formfields [name="slot"]');slot.innerHTML=arr.map(x=>`<option value="${x.v}">${esc(x.t)}</option>`).join('');};}
function useEquipment(){const eq=state.hand[0];if(!eq)return;const id=eq.id;const all=targetOptions(p=>p.alive),others=targetOptions(p=>p.alive&&p.seat!==state.me);const armed=targetOptions(p=>p.alive&&p.gun),wounded=targetOptions(p=>p.alive&&p.wounded);const noGun=targetOptions(p=>p.alive&&!p.gun);const shot=state.pending?.kind==='shot';const plain=['vest','smoke','coffee','camera','database','metal'];if(plain.includes(id))return send({type:'playEquipment'});
 if(id==='shield'){const victim=state.pending?.victim;if(victim===undefined)return notif('Lá này chỉ dùng khi đang bắn.');const opts=targetOptions(p=>p.alive&&p.seat!==victim&&p.seat!==state.pending.shooter);return simpleTarget(eq.name,opts,v=>send({type:'playEquipment',target:v.target}));}
 if(id==='restrain')return simpleTarget(eq.name,targetOptions(p=>p.alive&&p.seat!==state.pending?.victim&&p.seat!==state.pending?.shooter),v=>send({type:'playEquipment',target:v.target}));
 if(id==='wiretap'||id==='blackmail'||id==='confiscation'){
  const targets=id==='confiscation'?armed:others;const second=id==='confiscation'?noGun:others;
  if(!targets.length||!second.length)return notif('Chưa có đủ mục tiêu hợp lệ.');
  let fields=field('Mục tiêu 1','target',targets);if(id!=='confiscation')fields+=field('Lá của người thứ nhất','slot',cardOptions(Number(targets[0].v),id==='wiretap'));
  fields+=field('Mục tiêu 2','target2',second);if(id!=='confiscation')fields+=field('Lá của người thứ hai','slot2',cardOptions(Number(second[0].v),id==='wiretap'));
  return promptSimple(eq.name,fields,v=>send({type:'playEquipment',...v}),eq.description);
 }
 if(id==='bribe'){pick={kind:'equipment',id,stage:'target'};render();return;}
 const targets=id==='k9'||id==='taser'?armed:id==='medkit'?wounded:id==='evidence'?targetOptions(p=>p.alive&&p.seat!==state.me&&p.handCount):id==='defib'?targetOptions(p=>!p.alive):id==='polygraph'||id==='serum'?others:all;
 return simpleTarget(eq.name,targets,v=>send({type:'playEquipment',target:v.target}));
}

function confirmPlay(title,summary,action){confirmation=title==='Xác nhận nổ súng'?'shot':'SELECT_CARD';modal(title,'<div class="confirm-body">'+esc(summary)+'</div>','Xác nhận',action);}
function handleOwnCard(slot){
  const p=state.players[state.me];if(!state.myCards[slot])return;
  if(state.pending?.kind==='bribe'&&state.pending.owner===state.me&&state.pending.canSwap)return confirmPlay('Đổi Tiền Bẩn',`Đổi lá của bạn số ${slot+1}?`,()=>send({type:'resolveBribe',decisionId:state.pending.decisionId,swap:true,ownSlot:slot}));
  if(state.pending?.kind==='reveal'&&state.turn===state.me&&!state.myCards[slot].revealed)return confirmPlay('Công khai danh tính',`Lật lá số ${slot+1} (${label[state.myCards[slot].type]}) cho tất cả người chơi?`,()=>send({type:'chooseReveal',slot}));
  if(state.pending?.kind==='serum'&&state.pending.target===state.me&&!state.myCards[slot].revealed)return confirmPlay('Huyết Thanh Nói Thật',`Lật công khai lá số ${slot+1}?`,()=>send({type:'serumReveal',slot}));
  showCardDetail(label[state.myCards[slot].type],`Lá số ${slot+1} · ${state.myCards[slot].revealed?'Đã công khai':'Bí mật chỉ bạn biết'}`,cardSeal(state.myCards[slot].type));
}
function showCardDetail(title,desc,art){const m=$('#modal');m.classList.remove('hide');m.innerHTML=`<section class="modal card-inspect"><div class="eyebrow">HỒ SƠ CHI TIẾT</div><div class="inspector-art">${esc(art||'✦')}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="modalbuttons">${buttons('Đóng','close','primary')}</div></section>`;}
function finishEquipment(rest){if(!pick||pick.kind!=='equipment')return;const id=pick.id;pick=null;render();return send({type:'playEquipment',...rest});}
function handleCardClick(seat,slot){
  if(seat===state.me)return handleOwnCard(slot);
  const p=state.players[seat],c=p?.cards[slot];if(!p||!c)return;
  if(pick?.kind==='equipment'){
    if(!eligibleCard(seat,slot))return notif('Lá này không hợp lệ với trang bị đang chọn.');
    if(pick.id==='bribe')return finishEquipment({target:seat,slot});
    if(['wiretap','blackmail'].includes(pick.id)){
      if(pick.selected===undefined){pick.selected=seat;pick.slot=slot;render();return;}
      return finishEquipment({target:pick.selected,slot:pick.slot,target2:seat,slot2:slot});
    }
    return handleSeatClick(seat);
  }
  if(state.turn===state.me&&state.phase==='action'&&!state.pending&&p.alive&&!c.shown&&!p.effects.disguise){
    return confirmPlay('Điều tra lá bài',`Bạn muốn dùng hành động chính để xem lá ${slot+1} của ${p.name}? Chỉ mình bạn biết kết quả.`,()=>send({type:'actionInvestigate',target:seat,slot}));
  }
  const known=state.known[`${p.id}:${slot}`];const type=c.type||known?.type;
  showCardDetail(type?label[type]:'HỒ SƠ CHƯA XÁC MINH',type?`Ghế ${seat+1}, lá ${slot+1}. ${c.shown?'Công khai':'Bạn đã từng điều tra'}`:'Danh tính này chưa được tiết lộ. Không thể xem bài bí mật của đối thủ.',type?cardSeal(type):'◎');
}
function handleSeatClick(seat){
  const target=state.players[seat],me=state.players[state.me];if(!target)return;
  if(pick?.kind==='equipment'){
    if(!eligibleSeat(seat))return notif('Mục tiêu chưa hợp lệ. Hãy chọn mục tiêu được viền sáng.');
    const id=pick.id;
    if(['wiretap','blackmail','bribe'].includes(id))return notif('Hãy chạm trực tiếp vào lá danh tính của người chơi.');
    if(id==='confiscation'){
      if(pick.selected===undefined){pick.selected=seat;render();return;}
      return finishEquipment({target:pick.selected,target2:seat});
    }
    return finishEquipment({target:seat});
  }
  if(state.status!=='playing'||state.turn!==state.me||state.pending||!target.alive||seat===state.me)return;
  if(state.phase==='aim'&&me.gun)return send({type:'chooseAim',target:seat});
  if(state.phase==='action'&&me.gun&&me.aim===seat&&!me.gunFresh)return confirmPlay('Xác nhận nổ súng',`Bắn ${target.name}? Các trang bị phản ứng sẽ được xử lý trước khi phát bắn có hiệu lực.`,()=>send({type:'actionShoot'}));
  return notif('Chạm lá úp để điều tra. Chỉ ngắm được người khác trong giai đoạn ngắm.');
}
function activateEquipment(index=0){
  if(!state?.hand?.[index])return;
  if(state.pending?.kind==='discard'&&state.turn===state.me){return confirmPlay('Bỏ trang bị',`Bỏ ${state.hand[index].name} và giữ lại lá khác?`,()=>send({type:'discardHand',index}));}
  if(state.pending&&state.pending.kind!=='shot')return notif('Hãy hoàn tất lựa chọn đang chờ.');
  const eq=state.hand[index];if(state.hand.length!==1)return notif('Trước tiên hãy bỏ bớt trang bị để chỉ giữ một lá.');
  if(['vest','smoke','coffee','camera','database','metal'].includes(eq.id))return confirmPlay(`Dùng ${eq.name}`,eq.description,()=>send({type:'playEquipment'}));
  pick={kind:'equipment',id:eq.id,stage:'target'};render();
}
function handleBoardItem(item){
  if(!state||state.status!=='playing')return;
  if(state.turn!==state.me||state.pending||state.phase!=='action')return notif('Chỉ được lấy súng hoặc trang bị bằng hành động chính trong lượt mình.');
  if(item==='gun')return confirmPlay('Lấy súng','Lấy một khẩu súng ở giữa bàn, sau đó chọn lá của bạn để công khai và chọn người để ngắm.',()=>send({type:'actionArm'}));
  if(item==='equipment')return confirmPlay('Rút trang bị','Rút một lá trang bị. Nếu phải công khai danh tính hoặc bỏ bớt trang bị, hãy chạm trực tiếp lá cần chọn.',()=>send({type:'actionEquip'}));
}
root.addEventListener('click',e=>{
  const el=e.target.closest('[data-pick-card], [data-pick-seat], [data-select-person], [data-own-card], [data-board-item], [data-eqcard-index]');if(!el)return;
  if(!state||state.status!=='playing')return;
  if(el.hasAttribute('data-pick-card')){e.preventDefault();e.stopPropagation();const [s,k]=el.dataset.pickCard.split(':').map(Number);return handleCardClick(s,k);}
  if(el.hasAttribute('data-own-card'))return handleOwnCard(Number(el.dataset.ownCard));
  if(el.hasAttribute('data-eqcard-index'))return activateEquipment(Number(el.dataset.eqcardIndex));
  if(el.hasAttribute('data-board-item'))return handleBoardItem(el.dataset.boardItem);
  const seat=el.hasAttribute('data-select-person')?el.dataset.selectPerson:el.dataset.pickSeat;
  if(seat!==undefined)return handleSeatClick(Number(seat));
});
root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-select-person]')){e.preventDefault();handleSeatClick(Number(e.target.dataset.selectPerson));}});
root.addEventListener('contextmenu',e=>{const el=e.target.closest('[data-eqcard-index],[data-pick-card],[data-own-card]');if(!el||!state)return;e.preventDefault();
  if(el.hasAttribute('data-eqcard-index')){const x=state.hand[Number(el.dataset.eqcardIndex)];if(x)showCardDetail(x.name,x.description,equipmentArt[x.id]);}
  else if(el.hasAttribute('data-own-card')){const n=Number(el.dataset.ownCard);showCardDetail(label[state.myCards[n].type],`Lá ${n+1} của bạn`,cardSeal(state.myCards[n].type));}
  else{const [s,k]=el.dataset.pickCard.split(':').map(Number),p=state.players[s],c=p.cards[k],v=c.type||state.known[`${p.id}:${k}`]?.type;showCardDetail(v?label[v]:'LÁ CHƯA XÁC MINH',v?'Đã biết':'Bí mật chưa điều tra',v?cardSeal(v):'◎');}
});
root.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-eqcard-index],[data-pick-card],[data-own-card]');if(!el||e.pointerType==='mouse')return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{hoverTimer=null;const evt=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(evt);},750);});
for(const ev of ['pointerup','pointercancel','pointermove'])root.addEventListener(ev,()=>{if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}});
root.addEventListener('dragstart',e=>{const el=e.target.closest('[data-board-item],[data-eqcard-index],[data-drag-gun]');if(!el)return;dragged={kind:el.hasAttribute('data-board-item')?'board':el.hasAttribute('data-eqcard-index')?'gear':'gun',value:el.dataset.boardItem||el.dataset.eqcardIndex||el.dataset.dragGun};e.dataTransfer?.setData('text/plain',JSON.stringify(dragged));});
root.addEventListener('dragover',e=>{if(e.target.closest('[data-pick-seat],[data-select-person],[data-pick-card],[data-own-card]'))e.preventDefault();});
root.addEventListener('drop',e=>{e.preventDefault();const seatEl=e.target.closest('[data-pick-seat],[data-select-person]'),cardEl=e.target.closest('[data-pick-card]');if(!dragged)return;const drag=dragged;dragged=null;
  if(drag.kind==='board')return handleBoardItem(drag.value);
  if(drag.kind==='gun'&&seatEl)return handleSeatClick(Number(seatEl.dataset.pickSeat??seatEl.dataset.selectPerson));
  if(drag.kind==='gear'){activateEquipment(Number(drag.value));if(!state.hand[Number(drag.value)])return;if(cardEl){const [seat,slot]=cardEl.dataset.pickCard.split(':').map(Number);return handleCardClick(seat,slot);}if(seatEl)return handleSeatClick(Number(seatEl.dataset.pickSeat??seatEl.dataset.selectPerson));}
});
root.addEventListener('click',async e=>{const button=e.target.closest('[data-act]');if(!button)return;const action=button.dataset.act;
 if(action==='declineBribe')return send({type:'resolveBribe',decisionId:state.pending?.decisionId,swap:false});
 if(action==='cancelPick'){pick=null;confirmation=null;render();return;}
 if(action==='create'||action==='join'||action==='solo')return newRoom(action);
 if(action==='copy'){await navigator.clipboard?.writeText(state.code);return notif('Đã sao chép mã phòng: '+state.code);}
 if(action==='share'){await navigator.clipboard?.writeText(location.href);return notif('Đã sao chép đường dẫn mời.');}
 if(action==='start'||action==='restart')return send({type:action});
 if(action==='setBots')return send({type:'setBots',count:Number($('#lobbyBotCount')?.value||0),level:$('#lobbyBotLevel')?.value||'normal'});
 if(action==='chat'){const input=$('#chat');if(!input?.value.trim())return;const message=input.value;input.value='';return send({type:'chat',message});}
 if(action==='useEquipment')return activateEquipment();return chooseTurn(action);
});
$('#modal').addEventListener('click',e=>{const action=e.target.closest('[data-act]')?.dataset.act;if(action==='close'||e.target===$('#modal')){confirmation=null;$('#modal').classList.add('hide');}if(action==='confirm'){const cb=$('#modal')._callback;$('#modal').classList.add('hide');cb?.();}});
// Keep rendering separate from modals: action response arrives through SSE after server validation.
const code=codeFromURL();if(code&&localStorage.getItem('sd-'+code)){session={code,token:localStorage.getItem('sd-'+code)};connect();}else home();

// Update text only: never replace focused controls while a deadline ticks.
if(typeof setInterval==='function')setInterval(()=>{if(typeof document.querySelectorAll==='function')for(const el of document.querySelectorAll('[data-countdown]'))el.textContent=String(Math.max(0,Math.ceil((Number(el.dataset.countdown)-Date.now())/1000)));},250);
