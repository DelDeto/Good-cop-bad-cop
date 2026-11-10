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
 if(state?.pending?.kind==='equipment-discard'&&state.pending.owner===state.me)return 'SELECT_CARD';
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
 const names=`#${p.shooter+1} ${state.players[p.shooter].name} → #${p.victim+1} ${state.players[p.victim].name}`;
 return `<div class="reaction-table" role="status"><strong title="${esc(names)}">🎯 ${esc(names)}</strong><span>Phản ứng: ${state.hand.filter(validReaction).map(eq=>esc(eq.name)).join(' · ')||'Có thể bỏ qua / chờ người khác'}</span><span>${p.deadline?`Tự xử lý: <b data-countdown="${p.deadline}">…</b>s`:'Không tự xử lý'} · Người bắn xác nhận sau <b data-countdown="${p.forceAt||p.since+15000}">…</b>s</span></div>`;
}

let pick=null; let hoverTimer=null; let holdOrigin=null; let dragged=null;
const physicalArt={vest:0,planted:1,smoke:2,coffee:3,camera:4,disguise:5,taser:6,k9:7,medkit:8,serum:9,shield:10,restrain:11,walkie:12,wiretap:13,polygraph:14,wire:15,blackmail:16,bribe:17,confiscation:18,evidence:19,database:20,defib:21,metal:22};

const equipmentArt={vest:'🛡',planted:'🗂',smoke:'◉',coffee:'☕',camera:'◈',disguise:'♟',taser:'ϟ',k9:'♞',medkit:'✚',serum:'⚗',shield:'▱',restrain:'⛓',walkie:'▣',wiretap:'⌁',polygraph:'≋',wire:'◌',blackmail:'✉',bribe:'＄',confiscation:'⌖',evidence:'▤',database:'▦',defib:'✚',metal:'◎'};
// Artwork is assigned only from public seat order, never from hidden role/team values.
const agentAvatar=p=>`<svg class="portrait-art" data-portrait="${p.seat%8}" viewBox="${(p.seat%4)*443.5} ${Math.floor(p.seat/4)*443.5} 443.5 443.5" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Chân dung mật vụ ghế ${p.seat+1}"><image href="/portraits.webp?v=1.8.0" width="1774" height="887"/></svg>`;
const roleArt=kind=>{const i=['honest','crooked','agent','kingpin'].indexOf(kind);return i<0?'':`<svg class="role-portrait role-${kind}" viewBox="${(i%2)*630.5} ${Math.floor(i/2)*623.5} 630.5 623.5" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="/roles.webp?v=1.8.0" width="1261" height="1247"/></svg>`;};
const equipmentIllustration=index=>`<svg class="equipment-art" viewBox="0 0 256 256" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><svg width="256" height="256" viewBox="${(index%6)*256} ${Math.floor(index/6)*256} 256 256" overflow="hidden"><image href="/item-art.webp?v=1.8.0" width="1536" height="1024"/></svg></svg>`;
const artPosition=index=>`--art-x:${(index%6)*20}%;--art-y:${Math.floor(index/6)*100/3}%`;
function detailArtwork(art){const role=Object.keys(label).find(k=>cardSeal(k)===art);if(role)return roleArt(role);const eq=Object.keys(equipmentArt).find(k=>equipmentArt[k]===art);return eq?equipmentIllustration(physicalArt[eq]):'<span class="dossier-back" aria-hidden="true">◎</span>';}
const cardSeal=(type)=>type==='agent'?'★':type==='kingpin'?'♛':type==='honest'?'✦':'✕';
const notif=(message)=>{const el=$('#toast');el.innerHTML=`<div class="toast">${esc(message)}</div>`;clearTimeout(window._toast);window._toast=setTimeout(()=>el.innerHTML='',3500);};
const api=async(url,data)=>{const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Lỗi máy chủ');return j;};
const codeFromURL=()=>new URLSearchParams(location.search).get('room')?.toUpperCase();
function navbar(suffix='HỒ SƠ BÍ MẬT'){return `<header class="topbar"><div class="brand"><div class="mark">✪</div><div><h1>Điệp Viên <span>Số Dách</span></h1><small>GOOD COP · BAD COP <b>ONLINE V1.8</b></small></div></div><div class="topnote"><span class="live-dot"></span>${esc(suffix)}<br><small>HỒ SƠ MẬT · 23 TRANG BỊ</small></div></header>`;}

const ROLE_GUIDE = Object.freeze([
 {type:'honest',name:'ĐIỆP VIÊN',team:'PHE ĐIỆP VIÊN',description:'Lá thường thuộc phe Điệp Viên. Nếu không có lá thủ lĩnh, phe của bạn được xác định theo đa số ba lá.'},
 {type:'crooked',name:'MAFIA',team:'PHE MAFIA',description:'Lá thường thuộc phe Mafia. Nếu không có lá thủ lĩnh, phe của bạn được xác định theo đa số ba lá.'},
 {type:'agent',name:'ĐẶC VỤ',team:'THỦ LĨNH ĐIỆP VIÊN',description:'Lá thủ lĩnh phe Điệp Viên. Phe Điệp Viên thua nếu Đặc Vụ bị loại. Người có lá này có thể chịu một lần bị thương trước khi bị loại.'},
 {type:'kingpin',name:'TRÙM MAFIA',team:'THỦ LĨNH MAFIA',description:'Lá thủ lĩnh phe Mafia. Phe Mafia thua nếu Trùm Mafia bị loại. Người có lá này có thể chịu một lần bị thương trước khi bị loại.'}
]);
function roleGuideSection(){
 return `<section id="role-library" class="role-library" aria-labelledby="role-library-title"><div class="role-library-head"><div><span class="eyebrow">BỘ HỒ SƠ NHÂN VẬT</span><h2 id="role-library-title">NHẬN DIỆN <em>4 LÁ DANH TÍNH</em></h2><p>Chạm vào từng lá để xem hình ảnh và thông tin vai trò trước khi vào bàn chơi.</p></div><span class="role-library-count">04 / 04 LÁ</span></div><div class="role-library-grid">${ROLE_GUIDE.map(r=>`<button type="button" class="role-guide-card guide-${r.type}" data-role-guide="${r.type}" aria-label="Xem lá ${r.name}"><div class="role-guide-illustration">${roleArt(r.type)}</div><div class="role-guide-copy"><span class="role-guide-team">${r.team}</span><strong>${r.name}</strong><p>${r.description}</p><span class="role-guide-more">XEM LÁ LỚN ›</span></div></button>`).join('')}</div><p class="role-library-note">Mỗi người nhận 3 lá danh tính. Đặc Vụ hoặc Trùm Mafia quyết định phe khi có trên tay; các lá thường tính phe theo đa số. Người sở hữu đồng thời cả hai lá thủ lĩnh sẽ thắng đơn độc theo luật đang chạy.</p></section>`;
}
function home(){root.className='';root.innerHTML=navbar()+`<main class="home"><section><span class="eyebrow">MULTIPLAYER / HIDDEN IDENTITY</span><h2>AI LÀ <span>ĐỒNG MINH</span><br>AI LÀ KẺ <span>PHẢN BỘI?</span></h2><p>Thẩm vấn, lật thân phận, chơi trang bị và truy tìm thủ lĩnh đối phương. Mỗi người chơi trên thiết bị của mình, mọi bí mật được giữ trên máy chủ.</p><div class="hero-cards" aria-hidden="true"><div class="showcase-card cop"><span>ĐIỆP VIÊN</span>${roleArt('honest')}<small>TRUNG THÀNH</small></div><div class="showcase-card gear"><span>TRANG BỊ</span>${equipmentIllustration(9)}<small>HỒ SƠ TỐI MẬT</small></div><div class="showcase-card mafia"><span>MAFIA</span>${roleArt('kingpin')}<small>TRÙM CUỐI</small></div></div><div class="features"><span>◉ 4–8 người</span><span>◉ 23 trang bị</span><span>◉ Trình duyệt PC / Mobile</span><span>◉ Chơi với bot AI</span><span>◉ Đồng bộ phòng chơi</span></div></section><section class="box formbox"><h3>Đăng nhập vào cuộc điều tra</h3><div class="field"><label>Tên mật vụ</label><input id="name" maxlength="24" placeholder="Ví dụ: Ghế 03 · Đức" autocomplete="nickname" value="${esc(localStorage.getItem('sd-name')||'')}"></div><div class="solobox"><div class="eyebrow">CHẾ ĐỘ 01 · CHƠI VỚI BOT</div><div class="botselects"><div class="field"><label>Số BOT</label><select id="soloCount"><option value="3">3 BOT (bàn 4 người)</option><option value="4">4 BOT (bàn 5 người)</option><option value="5">5 BOT (bàn 6 người)</option><option value="6">6 BOT (bàn 7 người)</option><option value="7">7 BOT (bàn 8 người)</option></select></div><div class="field"><label>Độ khó</label><select id="soloLevel"><option value="normal">Thường</option><option value="hard">Khó</option></select></div></div><button class="btn primary wide" data-act="solo">🤖 CHƠI NGAY VỚI BOT · SOLO MODE</button><p class="tiny muted" style="margin:8px 0 0">Bot tự điều tra, ngắm, bắn và phản ứng; mỗi lượt có độ trễ để dễ theo dõi.</p></div><hr class="hr"><button class="btn wide" data-act="create">+ Tạo phòng với bạn bè · MULTIPLAYER</button><hr class="hr"><div class="field"><label>Mã phòng 6 ký tự</label><input id="code" maxlength="6" placeholder="VD: B4A8CD" class="mono" value="${esc(codeFromURL()||'')}"></div><button class="btn wide" data-act="join">↗ Tham gia phòng</button><p class="tiny muted">Không cần tài khoản. Phòng tự hết hạn sau 24 giờ.</p></section></main>${roleGuideSection()}<div class="footer">ĐIỆP VIÊN SỐ DÁCH · MINH HỌA NGUYÊN BẢN · CHƠI TRỰC TIẾP TRÊN TRÌNH DUYỆT</div>`;}
async function connect(){if(stream){stream.close();stream=null;}if(!session)return;let {code,token}=session;try{const r=await fetch(`/api/state?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`),j=await r.json();if(j.error||!r.ok){const e=Error(j.error||'Không thể đọc trạng thái.');e.status=r.status;throw e;}state=j;render();stream=new EventSource(`/api/events?code=${encodeURIComponent(code)}&token=${encodeURIComponent(token)}`);stream.onmessage=e=>{try{state=JSON.parse(e.data);connection='online';render();}catch(err){console.error(err)}};stream.onopen=()=>{connection='online';render();};stream.onerror=()=>{connection='reconnecting';render();};}catch(err){connection='reconnecting';if([400,401,403,404].includes(err.status)){localStorage.removeItem('sd-'+code);session=null;state=null;home();notif('Không thể kết nối: '+err.message);}else{if(state)render();else root.innerHTML=navbar('ĐANG KẾT NỐI LẠI')+'<main class="box"><p>Đang chờ kết nối. Phiên chơi của bạn được giữ lại.</p></main>';clearTimeout(window._reconnect);window._reconnect=setTimeout(connect,1500);}}}
async function newRoom(kind){try{const name=$('#name')?.value.trim();if(!name)throw Error('Vui lòng nhập tên.');localStorage.setItem('sd-name',name);let result;if(kind==='create'||kind==='solo')result=await api('/api/create',{name});else{const code=$('#code')?.value.trim().toUpperCase();if(code.length!==6)throw Error('Mã phòng phải có 6 ký tự.');result=await api('/api/join',{name,code});}
 if(kind==='solo'){
   const count=Number($('#soloCount').value),level=$('#soloLevel').value;
   await api('/api/command',{...result,command:{type:'setBots',count,level}});
   await api('/api/command',{...result,command:{type:'start'}});
 }
 session=result;localStorage.setItem('sd-'+result.code,result.token);history.replaceState(null,'',`?room=${result.code}`);connect();
 }catch(err){notif(err.message);}}

async function send(command){if(!session||busy)return;busy=true;const usedEquipment=state?.hand[0]?.id;render();try{const r=await api('/api/command',{code:session.code,token:session.token,command});state=r.state;if(command.type!=='chat')pick=null;render();animateAccepted(command,usedEquipment);if(command.type==='actionInvestigate'){const q=state.players[Number(command.target)],k=state.known[`${q.id}:${Number(command.slot)}`];if(k)showCardDetail('Hồ sơ đã xác minh',`${q.name} · Lá ${Number(command.slot)+1}: ${label[k.type]}. Chỉ bạn được xem kết quả này.`,cardSeal(k.type));}}catch(err){if(command.type!=='chat')pick=null;confirmation=null;notif(err.message);try{const fresh=await fetch(`/api/state?code=${encodeURIComponent(session.code)}&token=${encodeURIComponent(session.token)}`).then(r=>r.json());if(!fresh.error)state=fresh;}catch{notif('Mất kết nối. Đang chờ đồng bộ lại.');}}finally{busy=false;render();}}

function lobby(){const spots=Array.from({length:8},(_,i)=>state.players[i]?`<div class="lobbyseat"><small>GHẾ ${String(i+1).padStart(2,'0')}</small><strong>${esc(state.players[i].name)} ${state.players[i].bot?'🤖':''}</strong><div class="my-info">${i===state.me?'✦ BẠN':state.players[i].bot?'BOT TỰ ĐỘNG':i===0?'CHỦ PHÒNG':'ĐÃ THAM GIA'}</div></div>`:`<div class="lobbyseat empty"><small>GHẾ ${String(i+1).padStart(2,'0')}</small><strong>Chưa có người</strong></div>`).join('');root.innerHTML=navbar('PHÒNG CHỜ')+`<main class="layout lobbycenter"><div class="banner"><div><div class="eyebrow">MẬT MÃ PHÒNG</div><div class="roomline"><strong class="roomcode">${esc(state.code)}</strong>${buttons('⧉ Sao chép mã','copy')}</div></div><div class="right"><span class="pill gold">${state.players.length}/8 người</span>${buttons('↗ Chia sẻ link','share','ghost')}</div></div><div class="panel"><div class="panelhead"><h3>DANH SÁCH MẬT VỤ</h3><span class="muted tiny">Cần tối thiểu 4 người</span></div><div class="panelbody"><div class="lobbyseats">${spots}</div><div class="joinhint">${state.isOwner?'Bạn là chủ phòng. Khi đủ 4 người, nhấn bắt đầu để chia bài bí mật.':'Đang chờ chủ phòng bắt đầu. Hãy chia sẻ mã để mời bạn bè.'}</div>${state.isOwner?`<div class="lobby-controls"><div class="botselects"><div class="field"><label>Thêm bot vào phòng</label><select id="lobbyBotCount">${Array.from({length:8-state.players.filter(p=>!p.bot).length},(_,i)=>`<option value="${i}" ${i===state.players.filter(p=>p.bot).length?'selected':''}>${i} bot</option>`).join('')}</select></div><div class="field"><label>Độ khó bot</label><select id="lobbyBotLevel"><option value="normal">Thường</option><option value="hard">Khó</option></select></div></div>${buttons('Cập nhật bot','setBots','wide')}${buttons('▶ BẮT ĐẦU ĐIỀU TRA','start','primary wide')}</div>`:''}</div></div></main>`;}
function canShoot(){const p=state?.players[state.me];return !!(state?.status==='playing'&&state.turn===state.me&&state.phase==='action'&&!state.pending&&p?.alive&&p.gun&&!p.gunFresh&&p.aim!==null&&state.players[p.aim]?.alive);}
function actions(){
  if(busy)return '<div class="hint-panel">Đang gửi lệnh và chờ máy chủ xác nhận…</div>';
  const me=state.players[state.me], own=state.turn===state.me, pend=state.pending;
  if(!me.alive) return '<div class="hint-panel">Bạn đã bị loại. Có thể quan sát phần còn lại của ván.</div>';
  if(pend?.kind==='shot')return `<div class="hint-panel danger">🔫 ${esc(state.players[pend.shooter].name)} đang bắn ${esc(state.players[pend.victim].name)}. Chạm lá trang bị để phản ứng.</div>${!pend.passes.includes(state.me)?buttons('✓ Bỏ qua phản ứng','passShot','wide'):''}${own&&state.me===pend.shooter?buttons('Hoàn tất bắn (sau 15 giây)','forceShot','ghost wide'):''}`;
  if(pend?.kind==='bribe')return pend.owner===state.me?`<div class="hint-panel gold">Tiền Bẩn: ${esc(label[state.known[`${state.players[pend.target].id}:${pend.slot}`]?.type])}. ${pend.canSwap?'Chạm lá của bạn để đổi, hoặc chỉ giữ kết quả.':'Lá thủ lĩnh: chỉ giữ kết quả điều tra.'}</div><p>Hết hạn sau <span data-countdown="${pend.deadline}">${Math.max(0,Math.ceil((pend.deadline-Date.now())/1000))}</span> giây: tự động không đổi, trang bị đã dùng.</p>${buttons('Chỉ điều tra / Không đổi','declineBribe','wide')}`:'<div class="hint-panel">Đang chờ chủ Tiền Bẩn quyết định.</div>';
  if(pend?.kind==='serum')return state.me===pend.target?'<div class="hint-panel gold">Chạm một trong ba lá danh tính của bạn để lật công khai.</div>':'<div class="hint-panel">Đang chờ mục tiêu lật bài vì Huyết Thanh Nói Thật.</div>';
  if(pend?.kind==='equipment-discard')return state.me===pend.owner?`<div class="hint-panel gold">Tịch Thu Tang Chứng: chạm lá muốn bỏ (<span data-countdown="${pend.deadline}">…</span>s).</div>`:'<div class="hint-panel">Đang chờ người nhận trang bị bỏ một lá.</div>';
  if(!own)return `<div class="hint-panel">Đang đến lượt <b>${esc(state.players[state.turn].name)}</b>. Bạn có thể sử dụng trang bị nếu luật cho phép.</div>`;
  if(pend?.kind==='discard')return '<div class="hint-panel gold">Chạm lá trang bị bạn muốn bỏ để giữ đúng một lá.</div>';
  if(pend?.kind==='reveal')return '<div class="hint-panel gold">Chạm một lá danh tính của bạn để lật công khai sau khi lấy súng/trang bị.</div>';
  if(state.phase==='action')return `<div class="hint-panel gold"><b>Chạm trực tiếp trên bàn:</b><br>① Bài úp của đối thủ → Điều tra<br>② Súng ở giữa → Lấy súng<br>③ Chồng trang bị → Rút bài<br>④ Người bạn đang ngắm → Bắn</div><details class="legacy-actions"><summary>Thao tác thay thế (hỗ trợ)</summary><div class="actions">${buttons('Điều tra','investigate')}${buttons('Lấy súng','arm')}${buttons('Rút trang bị','equip')}${canShoot()?buttons('Bắn','shoot','danger'):''}</div></details>`;
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
  return state.turn===state.me&&!state.pending&&state.phase==='action'&&!own&&p.alive&&!p.effects.disguise&&!c.shown&&!state.known[`${p.id}:${slot}`];
}
function eligibleSeat(seat){
  if(!state||state.status!=='playing')return false;
  const q=state.players[seat],my=state.players[state.me],pend=state.pending;
  if(pick?.kind==='equipment'){
    const id=pick.id,second=pick.selected!==undefined,target=pick.selected;
    if(!q.alive&&id!=='defib')return false;
    if(id==='defib')return !q.alive&&seat!==state.me&&q.cards.every(c=>!['agent','kingpin'].includes(c.type));
    if(id==='medkit')return q.wounded;
    if(['k9','taser'].includes(id))return q.gun&&(id!=='taser'||seat!==state.me);
    if(id==='evidence')return second?seat!==state.me&&seat!==target:seat!==state.me&&q.handCount>0;
    if(id==='restrain')return pend?.kind==='shot'&&seat!==pend.shooter&&seat!==pend.victim;
    if(id==='shield')return pend?.kind==='shot'&&aliveNeighbors(pend.victim).includes(seat);
    if(id==='confiscation')return second?seat!==state.me&&seat!==target&&!q.gun:q.gun;
    if(['wiretap','blackmail'].includes(id))return seat!==state.me&&(!second||seat!==target)&&(!q.effects.disguise||id==='blackmail')&&(id==='blackmail'||q.cards.some(c=>!c.shown));
    if(id==='bribe')return second?seat===state.me:seat!==state.me&&!q.effects.disguise&&q.cards.some(c=>!c.shown);
    if(id==='serum')return q.cards.some(c=>!c.shown);
  if(id==='polygraph')return seat!==state.me&&!q.effects.disguise&&q.cards.some(c=>!c.shown);
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
     id==='evidence'?(pick.selected===undefined?'Chạm người đang có trang bị.':'Chạm người nhận trang bị (khác bạn).'):
     'Chạm avatar của người chơi phù hợp để sử dụng trang bị.');
    return `<div class="pick-banner"><span>🃏 ĐANG DÙNG: <b>${esc(eq?.name||id)}</b><br>${esc(message)}</span><div class="pick-actions">${buttons('Hủy','cancelPick','ghost')}</div></div>`;
  }
  if(state?.pending?.kind==='shot')return `<div class="pick-banner warning"><span>⚠️ ĐANG CÓ PHÁT BẮN · Chạm trang bị phản ứng hoặc chọn “Bỏ qua”.</span></div>`;
  return `<div class="pick-banner"><span>♟ <b>Chạm trực tiếp trên bàn:</b> Chạm lá úp để điều tra · Chạm súng để lấy · Chạm trang bị để dùng · Chạm avatar để ngắm / bắn</span></div>`;
}
function renderGear(eq,i){const artIndex=physicalArt[eq.id];return `<button type="button" data-eqcard-index="${i}" draggable="true" class="equipment gear-card physical-gear ${(pick?.id===eq.id?'selected':'')} ${validReaction(eq)?'reaction-ready':''}" aria-label="Dùng trang bị ${esc(eq.name)}" title="Chạm để dùng; nhấn giữ để đọc kỹ"><div class="gear-head"><span class="eyebrow">TRANG BỊ · ${esc(eq.category)}</span><span class="gear-number">#${String(i+1).padStart(2,'0')}</span></div><div class="gear-illustration ${artIndex!==undefined?'photo-art':''}" style="${artIndex!==undefined?artPosition(artIndex):''}">${artIndex===undefined?'':equipmentIllustration(artIndex)}</div><strong>${esc(eq.name)}</strong><p>${esc(eq.description)}</p><span class="card-foot">CHẠM ĐỂ KÍCH HOẠT · GCB</span></button>`;}

// Viewer-relative positions; public server seat indices never change.
const seatPlans={
 4:[[17,55],[50,14],[83,55]],
 5:[[17,62],[34,14],[66,14],[83,62]],
 6:[[17,65],[24,14],[50,14],[76,14],[83,65]],
 7:[[17,77],[17,44],[34,14],[66,14],[83,44],[83,77]],
 8:[[17,77],[17,44],[26,14],[50,14],[74,14],[83,44],[83,77]]
};
function seatPosition(seat,me,total){const relative=(seat-me+total)%total;if(relative===0)return {relative,x:50,y:100,mx:50,my:100};const [x,y]=seatPlans[total][relative-1];const mobile={4:[[25,17],[75,17],[25,80]],5:[[25,17],[75,17],[25,83],[75,83]],6:[[25,16],[75,16],[25,49],[25,82],[75,82]]};const [mx,my]=mobile[total]?.[relative-1]||[y===14?(total===8?[20,50,80][relative-3]:x):x,y];return {relative,x,y:total===5&&y===62?76:y===14?17:y===44?50:y===77?83:y,mx,my:mobile[total]?my:total===5&&y===62?76:y===14?17:y===44?50:y===77?83:my};}
let drawer=null,connection='online',modalTrigger=null,chatDraft='';
let knownPositions=new Set(),stalePositions=new Set(),memoryRoom=null,lastMemoryStatus=null;
function trackMemory(){
 if(memoryRoom!==state.code||(lastMemoryStatus==='finished'&&state.status==='playing')){knownPositions=new Set();stalePositions=new Set();if(memoryRoom!==state.code){chatDraft='';if($('#chat'))$('#chat').value='';drawer=null;}memoryRoom=state.code;}lastMemoryStatus=state.status;
 for(const k of knownPositions)if(!state.known[k])stalePositions.add(k);
 for(const k of Object.keys(state.known)){knownPositions.add(k);stalePositions.delete(k);}
}
function roleButton(p,i){
 const own=p.seat===state.me,c=p.cards[i],known=state.known[`${p.id}:${i}`],mine=own?state.myCards[i]:null,type=mine?.type||c.type||known?.type;
 const visibility=own?(mine?.revealed?'CÔNG KHAI':'RIÊNG BẠN'):c.shown?'CÔNG KHAI':known?'ĐÃ BIẾT':stalePositions.has(`${p.id}:${i}`)?'HẾT HIỆU LỰC':'CHƯA BIẾT';
 const team=type==='honest'||type==='agent'?'cop':type?'mafia':'unknown';
 return `<button id="card-${p.seat}-${i}" type="button" data-pick-card="${p.seat}:${i}" ${own?`data-own-card="${i}"`:''} aria-label="Ghế ${p.seat+1}, lá ${i+1}: ${esc(type?label[type]:visibility)}" title="${esc(type?label[type]+' · '+visibility:visibility)}" class="mini physical-mini ${own?'secret physical-card ':''}${type?'face':'card-back'} ${team} ${known&&!c.shown&&!own?'known':''} ${eligibleCard(p.seat,i)?'tappable':''}"><span class="mini-watermark">${type?roleArt(type):'<span class="dossier-back">◎</span>'}</span><span class="mini-caption">${own?esc(label[type]):type?esc(label[type]):String(i+1)}</span><span class="mini-seal" aria-hidden="true">${type?cardSeal(type):''}</span><span class="card-visibility">${own?(mine?.revealed?'◉ Công khai':'◆ Bí mật'):c.shown?'◉':known?'◆':stalePositions.has(`${p.id}:${i}`)?'↻':'○'}</span></button>`;
}
function seatBox(p){
 const pos=seatPosition(p.seat,state.me,state.players.length),own=p.seat===state.me,aim=p.gun&&p.aim!==null&&state.players[p.aim]?.alive?state.players[p.aim]:null;
 const team=state.myTeam==='honest'?'Điệp viên':state.myTeam==='crooked'?'Mafia':'Đơn độc';
 const effects=Object.keys(p.effects||{}).filter(k=>p.effects[k]).map(k=>({wire:'🎧 Nghe lén',disguise:'♟ Cải trang',planted:'▤ Bằng chứng giả'}[k]||k));
 const threatened=p.alive&&state.players.some(q=>q.alive&&q.gun&&q.aim===p.seat);
 const shot=state.pending?.kind==='shot';const shotTarget=shot&&state.pending.shooter===p.seat?state.players[state.pending.victim]:null;
 return `<article data-seat="${p.seat}" data-pick-seat="${p.seat}" style="--seat-x:${pos.x}%;--seat-y:${pos.y}%;--seat-my:${pos.my}%;--seat-mx:${pos.mx}%" class="player seat-card ${own?'you':''} ${p.seat===state.turn&&state.status==='playing'?'active':''} ${!p.alive?'dead':''} ${p.wounded?'wounded':''} ${threatened?'aimed-at':''} ${p.gun?'has-gun':''} ${p.bot?'npc':''} ${eligibleSeat(p.seat)?'targetable':''} ${shot&&state.pending.victim===p.seat?'shot-victim':''} ${shot&&state.pending.shooter===p.seat?'shot-shooter':''}" aria-label="Ghế ${p.seat+1} · ${esc(p.name)}${own?' · Bạn':''}">
 <div class="playerhead"><span class="seat">${own?'BẠN · #':'GHẾ '}${p.seat+1}${p.bot?' · BOT':''}</span><span class="own-team-mobile">${own?esc(team):''}</span><span class="own-flags" title="${esc(effects.join(' · '))}">${own?(p.gun?'⌖':'')+(effects.length?' ♟':''):''}</span><span class="seat-turn">${p.wounded?'✚ Thương · ':''}${p.seat===state.turn&&state.status==='playing'?'● Lượt này':!p.alive?'☠ Đã loại':''}</span><button type="button" class="seat-info" data-seat-info="${p.seat}" aria-label="Chi tiết ${esc(p.name)}">ⓘ</button></div>
 <div class="player-inner"><button type="button" class="avatar" data-select-person="${p.seat}" aria-label="Chọn ${esc(p.name)}">${agentAvatar(p)}${p.gun?`<span class="gun-badge" title="Có súng">${equipmentIllustration(18)}</span>`:''}${p.wounded?'<span class="wound-badge" aria-label="Bị thương">+</span>':''}<span class="portrait-health ${p.wounded?'hurt':''}">${!p.alive?'ĐÃ LOẠI':p.wounded?'BỊ THƯƠNG':'CÒN SỐNG'}</span></button><button id="person-${p.seat}" type="button" class="playername" data-select-person="${p.seat}" title="${esc(p.name)}">${esc(p.name)}</button></div>
 <div class="mini-cards">${p.cards.map((c,i)=>roleButton(p,i)).join('')}</div>
 <div class="armstrip">${own?`<span class="own-team-desktop">Phe ${esc(team)}</span>`:''}${!p.alive?'<span class="injury">☠ Đã loại</span>':''}${p.gun?`<span class="armed" title="${esc(aim?'Ngắm '+aim.name:'Chưa ngắm mục tiêu')}" data-drag-gun="${p.seat}" draggable="${own}">⌖ ${shotTarget?'🎯 #'+(shotTarget.seat+1):aim?'→ #'+(aim.seat+1):'Chưa ngắm'}</span>`:''}${p.wounded?'<span class="injury">✚ Thương</span>':''}${effects.length?`<span class="effect-chip" title="${esc(effects.join(' · '))}">${esc(effects.join(' · '))}</span>`:''}${shot&&state.pending.victim===p.seat?'<span class="injury">⚠ Bị bắn</span>':threatened?'<span class="aim-warning" title="Đang bị ngắm">◎ Bị ngắm</span>':''}</div></article>`;
}
function compactActions(){
 const me=state.players[state.me],p=state.pending;
 if(busy)return '<span class="action-hint" role="status">Đang chờ xác nhận…</span>';
 if(state.status==='finished')return `<span class="action-hint">${esc(state.winner)}</span>${state.isOwner?buttons('↻ Ván mới','restart','primary'):''}`;
 if(!me.alive)return '<span class="action-hint">☠ Bạn đã bị loại · Tiếp tục quan sát bàn.</span>';
 if(p?.kind==='shot')return `${!p.passes.includes(state.me)?buttons('Bỏ qua phản ứng','passShot','primary'):'<span class="action-hint">✓ Đã bỏ qua · Chờ phản ứng</span>'}${p.shooter===state.me?`<button class="btn" data-act="forceShot" data-force-at="${p.forceAt||p.since+15000}" disabled>Xử lý phát bắn</button>`:''}`;
 if(p?.kind==='bribe')return p.owner===state.me?`<span class="action-hint">Tiền Bẩn: ${esc(label[state.known[`${state.players[p.target].id}:${p.slot}`]?.type])}. ${p.canSwap?'Chọn bài của bạn để đổi.':'Lá thủ lĩnh: không đổi.'} <span data-countdown="${p.deadline}">…</span>s</span>${buttons('Không đổi','declineBribe','primary')}`:'<span class="action-hint">Chờ chủ Tiền Bẩn quyết định.</span>';
 if(p?.kind==='serum')return `<span class="action-hint">${p.target===state.me?'Chạm một trong ba lá danh tính của bạn để lật công khai.':'Chờ mục tiêu Huyết Thanh lật bài.'}</span>`;
 if(state.turn!==state.me)return `<span class="action-hint">Đang đến lượt ${esc(state.players[state.turn].name)} · Có thể dùng trang bị hợp lệ.</span>`;
 if(p?.kind==='reveal')return '<span class="action-hint">Chạm một lá danh tính của bạn để lật công khai.</span>';
 if(p?.kind==='discard')return '<span class="action-hint">Chạm trang bị để bỏ bớt, giữ đúng một lá.</span>';
 if(state.phase==='aim')return `<span class="action-hint">${me.gun?'Chạm avatar đối thủ để ngắm / đổi mục tiêu.':'Đã xong hành động chính.'}</span>${buttons('✓ KẾT THÚC LƯỢT','endTurn','primary')}`;
 return `${buttons('🔎 Điều tra','investigate')}${buttons('⌖ Lấy súng','arm')}${buttons('▤ Rút bài','equip')}${canShoot()?buttons('🎯 Bắn','shoot','danger'):''}`;
}
function hubHTML(){
 return `<div class="turn-medallion"><span>LƯỢT</span><b>${state.round}</b><small>${state.turn===state.me?'CỦA BẠN':'GHẾ '+(state.turn+1)}</small></div><div class="hub-objects"><button data-board-item="equipment" draggable="true" class="hub-deck" title="Rút trang bị" aria-label="Rút trang bị từ chồng bài">${equipmentIllustration(19)}<b>TRANG BỊ</b><small>${state.equipmentCount} lá</small></button><button data-board-item="gun" draggable="true" class="hub-gun" title="Lấy súng" aria-label="Lấy súng ở giữa bàn">${equipmentIllustration(18)}<b>SÚNG</b><small>${state.gunsFree}/${state.gunTotal} còn</small></button><button class="hub-discard" data-act="drawer-discard" aria-label="Xem nhật ký công khai của trang bị"><span class="discard-art" aria-hidden="true"></span><b>BÀI BỎ</b><small>Nhật ký</small></button></div><span class="hub-direction">${state.direction===1?'→ Thuận chiều':'← Ngược chiều'}</span>`;
}
function statusHTML(){const turn=state.players[state.turn];return `<div class="game-brand"><strong>ĐIỆP VIÊN <span>SỐ DÁCH</span></strong><small>ONLINE V1.8 · PHÒNG ${esc(state.code)}</small></div><div class="table-meta"><b>${state.players.length}/8 NGƯỜI</b><span>${state.players.some(p=>p.bot)?'CHƠI CÙNG BOT':'MULTIPLAYER'}</span></div><div class="turn-status" role="status"><small>${state.status==='finished'?'HỒ SƠ KHÉP LẠI':'LƯỢT '+state.round}</small><h1>${state.status==='finished'?'🏆 Kết thúc ván':state.turn===state.me?'ĐẾN LƯỢT BẠN':esc(turn.name)}</h1></div><div class="connection-status" title="${connection==='online'?'Đang đồng bộ trạng thái máy chủ':'Đang tự kết nối lại'}">${connection==='online'?'● Trực tuyến':'◌ Nối lại…'}</div>`;}
function gameFeedback(){if(state.pending?.kind==='shot')return reactionBanner();if(state.status==='finished')return `<div class="result-strip" role="status">🏆 ${esc(state.winner)}</div>`;return interactionGuide();}
function gameScaffold(){return `<main id="game-shell" class="game-shell" data-player-count="${state.players.length}"><header id="table-status" class="table-status"></header><section id="table-feedback" class="table-feedback" aria-live="polite"></section><section id="table-board" class="table-board" aria-label="Bàn chơi"><svg id="aim-lines" class="aim-lines" aria-hidden="true"></svg><div id="seats"></div><div id="table-hub" class="table-hub"></div><div id="event-strip" class="event-strip" role="status"></div><div id="table-effects" class="table-effects" aria-hidden="true"></div></section><section class="personal-dock" aria-label="Khu vực cá nhân"><div id="my-seat"></div><div id="my-gear" class="my-gear"></div><div id="turn-actions" class="turn-actions"></div></section><nav class="game-nav" aria-label="Thông tin bàn"><button data-act="drawer-memory">◆ Ghi nhớ</button><button data-act="drawer-timeline">≡ Nhật ký</button><button data-act="drawer-chat">☏ Chat</button><button data-act="drawer-help">? Trợ giúp</button><button data-act="copy">⧉ Mã phòng</button></nav><div id="drawer-host"></div></main>`;}
function patchPart(selector,html){const el=$(selector);if(el&&el._markup!==html){el.innerHTML=html;el._markup=html;}}
function board(){
 trackMemory();const me=state.players[state.me];
 const parts={'#table-status':statusHTML(),'#table-feedback':gameFeedback(),'#seats':state.players.filter(p=>p.seat!==state.me).map(p=>seatBox(p)).join(''),'#table-hub':hubHTML(),'#my-seat':seatBox(me),'#my-gear':`<span class="hand-label">TRANG BỊ · ${state.hand.length}/1</span>${state.hand.length?`<div class="hand-tray">${state.hand.map((eq,i)=>renderGear(eq,i)).join('')}</div>`:'<span class="empty-hand">▤ Chưa có trang bị</span>'}`,'#turn-actions':compactActions(),'#event-strip':state.log.length?`<span>${esc(state.log.at(-1).msg)}</span>${buttons('Chi tiết','drawer-timeline')}`:'<span>Chạm trực tiếp trên bàn để điều tra.</span>'};
 root.className='game-root';
 if(!$('#game-shell')){
  // String fallback also makes the existing DOM-free privacy/UI tests useful.
  let html=gameScaffold();for(const [selector,content] of Object.entries(parts))html=html.replace(new RegExp(`(<(?:header|section|div)[^>]*id="${selector.slice(1)}"[^>]*>)(</(?:header|section|div)>)`),(_,open,close)=>open+content+close);root.innerHTML=html;for(const [selector,content] of Object.entries(parts)){const el=$(selector);if(el)el._markup=content;}
 }else{
  const active=document.activeElement,id=active?.id,start=active?.selectionStart,end=active?.selectionEnd;
  for(const [selector,content] of Object.entries(parts))patchPart(selector,content);
  if(id&&document.activeElement!==active){const restored=$('#'+id);restored?.focus?.({preventScroll:true});if(typeof start==='number'&&restored?.setSelectionRange)restored.setSelectionRange(start,end);}
 }
 const shell=$('#game-shell');if(shell)shell.dataset.playerCount=state.players.length;
 renderDrawer();updateCountdowns();animatePublicChanges();if(typeof requestAnimationFrame==='function')requestAnimationFrame(drawAimLines);
}
function drawAimLines(){
 const table=$('#table-board'),svg=$('#aim-lines');if(!table||!svg||!table.getBoundingClientRect)return;
 const b=table.getBoundingClientRect();svg.setAttribute('viewBox',`0 0 ${b.width} ${b.height}`);
 let html='<defs><marker id="aim-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#d6b16a"/></marker><marker id="shot-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#ed8c82"/></marker></defs>';
 for(const p of state.players){const shot=state.pending?.kind==='shot'&&state.pending.shooter===p.seat;const targetSeat=shot?state.pending.victim:p.aim;if(!p.alive||!p.gun||targetSeat===null||!state.players[targetSeat]?.alive)continue;
  const from=document.querySelector(`[data-seat="${p.seat}"]`),to=document.querySelector(`[data-seat="${targetSeat}"]`);if(!from||!to)continue;
  const a=from.getBoundingClientRect(),z=to.getBoundingClientRect();const source=(from.querySelector?.('.gun-badge')||from.querySelector?.('.avatar')||from).getBoundingClientRect(),destination=(to.querySelector?.('.avatar')||to).getBoundingClientRect();
  const x=source.x+source.width/2-b.x,y=source.y+source.height/2-b.y,tx=destination.x+destination.width/2-b.x,ty=destination.y+destination.height/2-b.y,dx=tx-x,dy=ty-y;
  const exit=(r,px,py,vx,vy)=>Math.max(0,Math.min(vx>0?(r.right-b.x+8-px)/vx:vx<0?(r.left-b.x-8-px)/vx:Infinity,vy>0?(r.bottom-b.y+8-py)/vy:vy<0?(r.top-b.y-8-py)/vy:Infinity));
  const clamp=(n,max)=>Math.max(4,Math.min(max-4,n));const f=exit(a,x,y,dx,dy),t=exit(z,tx,ty,-dx,-dy);let sx=clamp(x+dx*f,b.width),sy=clamp(y+dy*f,b.height),ex=clamp(tx-dx*t,b.width),ey=clamp(ty-dy*t,b.height);
  let path=`M${sx} ${sy}L${ex} ${ey}`;
  if(targetSeat===p.seat){sx=Math.max(26,Math.min(b.width-30,a.x+a.width/2-b.x));sy=Math.max(32,Math.min(b.height-10,a.top-b.y-8));path=`M${sx} ${sy}c-22 -16 22 -30 24 -8c0 10 -9 16 -20 10`;}

  html+=`<path data-aim-from="${p.seat}" data-aim-to="${targetSeat}" d="${path}" class="${shot?'shot-line':'aim-line'}" marker-end="url(#${shot?'shot-arrow':'aim-arrow'})"><title>${esc(p.name)} → ${esc(state.players[targetSeat].name)}</title></path>`;
 }
 if(svg.innerHTML!==html)svg.innerHTML=html;
}

let visualSnapshot=null;
function animatePublicChanges(){
 const next={code:state.code,status:state.status,players:state.players.map(p=>({alive:p.alive,wounded:p.wounded,shown:p.cards.map(c=>c.shown)})),known:Object.keys(state.known)};const previous=visualSnapshot;visualSnapshot=next;
 if(!previous||previous.code!==next.code||previous.status==='finished'&&next.status==='playing'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 for(let i=0;i<next.players.length;i++){const p=next.players[i],old=previous.players[i];if(!old)continue;const el=document.querySelector(`[data-seat="${i}"]`);
  if(old.alive&&!p.alive)el?.querySelector?.('.avatar')?.animate?.([{filter:'brightness(1.7)'},{filter:'grayscale(1) brightness(.45)'}],{duration:700});
  else if(!old.wounded&&p.wounded)el?.animate?.([{boxShadow:'0 0 0 4px #e5a28d,0 0 35px #c85c40'},{boxShadow:'0 4px 12px #0008'}],{duration:650});
  p.shown.forEach((shown,j)=>{if(shown&&!old.shown[j])$(`#card-${i}-${j}`)?.animate?.([{transform:'perspective(500px) rotateY(-75deg)'},{transform:'none'}],{duration:320});});
 }
 for(const key of next.known)if(!previous.known.includes(key)){const split=key.lastIndexOf(':'),seat=state.players.find(p=>p.id===key.slice(0,split))?.seat;if(seat!==undefined)$(`#card-${seat}-${key.slice(split+1)}`)?.animate?.([{transform:'perspective(500px) rotateY(-65deg)'},{transform:'none'}],{duration:320});}
}
function animateAccepted(command,equipmentId){
 if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const card=command.target!==undefined&&command.slot!==undefined?$(`#card-${Number(command.target)}-${Number(command.slot)}`):null;
 const target=card||(command.target!==undefined?document.querySelector(`[data-seat="${Number(command.target)}"]`):null);
 if(command.type==='actionInvestigate')target?.animate?.([{filter:'brightness(1.6)',boxShadow:'0 0 18px #ffd479'},{filter:'brightness(1)',boxShadow:'none'}],{duration:650});
 if(command.type==='chooseAim')target?.animate?.([{outline:'3px solid #ffe0a2'},{outline:'0 solid transparent'}],{duration:500});
 const fx=$('#table-effects');if(command.type==='playEquipment'&&fx&&physicalArt[equipmentId]!==undefined){fx.innerHTML=`<div class="equipment-flare">${equipmentIllustration(physicalArt[equipmentId])}<b>ĐÃ DÙNG TRANG BỊ</b></div>`;const table=$('#table-board')?.getBoundingClientRect?.(),discard=$('.hub-discard')?.getBoundingClientRect?.();const dx=table&&discard?discard.x+discard.width/2-table.x-table.width/2:60,dy=table&&discard?discard.y+discard.height/2-table.y-table.height/2:0;const anim=fx.firstElementChild?.animate?.([{opacity:0,transform:'translateY(24px) rotate(-7deg) scale(.8)'},{opacity:1,transform:'none',offset:.25},{opacity:1,transform:'none',offset:.65},{opacity:0,transform:`translate(${dx}px,${dy}px) rotate(9deg) scale(.25)`}],{duration:1100});if(anim)anim.onfinish=()=>{fx.innerHTML='';$('.hub-discard')?.animate?.([{filter:'brightness(1.5)'},{filter:'brightness(1)'}],{duration:350});};}
}

function memoryHTML(){return state.players.map(p=>`<section class="memory-person"><h3>#${p.seat+1} · ${esc(p.name)}</h3>${p.cards.map((c,i)=>{const k=state.known[`${p.id}:${i}`],own=p.seat===state.me?state.myCards[i]:null,type=own?.type||c.type||k?.type;return `<button data-memory-card="${p.seat}:${i}">Lá ${i+1} · ${type?esc(label[type]):stalePositions.has(`${p.id}:${i}`)?'↻ Thông tin cũ hết hiệu lực':'○ Chưa biết'} <small>${c.shown?'◉ Công khai':k?'◆ Chỉ bạn biết':own?'◆ Bài của bạn':''}</small></button>`;}).join('')}</section>`).join('');}
function renderDrawer(){
 const host=$('#drawer-host');if(!host)return;
 if(!drawer){if($('#chat'))chatDraft=$('#chat').value;host.innerHTML='';return;}
 const creating=!$('#info-drawer');if(creating)host.innerHTML=`<div class="drawer-scrim" data-act="drawer-close"></div><aside id="info-drawer" class="info-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><header><h2 id="drawer-title"></h2>${buttons('Đóng ×','drawer-close')}</header><div id="drawer-content" class="drawer-content"></div><div id="drawer-chatbox" class="chatline"><input id="chat" maxlength="200" aria-label="Tin nhắn" placeholder="Trao đổi trên bàn…">${buttons('Gửi','chat')}</div></aside>`;
 if(creating&&$('#chat'))$('#chat').value=chatDraft;
 const titles={memory:'Hồ sơ riêng của bạn',timeline:'Diễn biến trên bàn',chat:'Trò chuyện',help:'Cách chơi trực tiếp',discard:'Nhật ký trang bị công khai'};const title=$('#drawer-title');if(title)title.textContent=titles[drawer];$('#info-drawer')?.setAttribute?.('aria-modal',String(state.pending?.kind!=='shot'));
 let html=drawer==='discard'?`<div class="timeline"><h3>NHẬT KÝ CÔNG KHAI</h3>${state.log.slice().reverse().map(x=>`<p>${esc(x.msg)}</p>`).join('')}</div>`:drawer==='memory'?memoryHTML():drawer==='help'?'<h3>Chạm trực tiếp trên bàn</h3><p>Chạm lá úp để điều tra, súng hoặc chồng bài để lấy. Sau hành động chính, chạm tên đối thủ để ngắm. Bắn cần xác nhận và có cửa sổ phản ứng.</p><p>Chạm trang bị để đọc và chọn Dùng. Các mục tiêu hợp lệ được viền sáng. Trang bị hai mục tiêu cho phép hủy trước khi gửi.</p><p>◆ là thông tin riêng; ◉ là bài công khai; ↻ nghĩa là ký ức vị trí cũ hết hiệu lực. Nhấn giữ lá để đọc chi tiết.</p>':`<div class="private-findings"><h3>◆ RIÊNG BẠN</h3>${state.privateLog.slice().reverse().map(x=>`<p>${esc(x)}</p>`).join('')||'<p>Chưa có kết quả riêng.</p>'}</div><div class="timeline"><h3>◉ Diễn biến công khai</h3>${state.log.slice().reverse().map(x=>`<p>${esc(x.msg)}</p>`).join('')}</div>`;
 patchPart('#drawer-content',html);const chat=$('#drawer-chatbox');if(chat)chat.style.display=drawer==='chat'?'flex':'none';
}
function inspectionFields(seat){
 const p=state.players[seat];const cards=p.cards.map((c,i)=>{const known=state.known[`${p.id}:${i}`],type=seat===state.me?state.myCards[i]?.type:c.type||known?.type;const visibility=seat===state.me?(state.myCards[i]?.revealed?'Công khai':'Riêng bạn'):c.shown?'Công khai':known?'Chỉ bạn biết':'Chưa biết';return `<button data-inspect-card="${seat}:${i}" class="inspect-role ${type?'face':'card-back'}" aria-label="Lá ${i+1}: ${esc(type?label[type]:'Chưa biết')}">${type?roleArt(type):'<span class="dossier-back"></span>'}<b>${esc(type?label[type]:'LÁ '+(i+1))}</b><small>${visibility}</small></button>`;}).join('');
 return `<div class="character-inspect"><div class="inspect-portrait">${agentAvatar(p)}</div><div class="inspect-public-status"><b>${p.alive?'Đang sống':'Đã bị loại'}</b>${p.wounded?'<span>+ Bị thương</span>':''}${p.gun?'<span>⌖ Có súng</span>':''}${seat===state.me?`<span>Phe ${esc(state.myTeam==='honest'?'Điệp viên':state.myTeam==='crooked'?'Mafia':'Đơn độc')}</span>`:''}</div></div><div class="inspect-card-choices">${cards}</div>`;
}
function inspectionSignature(seat){const p=state.players[seat];return JSON.stringify([p,state.myTeam,seat===state.me?state.myCards:null,p.cards.map((c,i)=>state.known[`${p.id}:${i}`]||null)]);}
function inspectSeat(seat){const p=state.players[seat],selectable=eligibleSeat(seat);modal(`#${seat+1} · ${p.name}`,inspectionFields(seat),selectable?'Chọn người này':'Đóng',()=>{if(selectable)handleSeatClick(seat);},'Chạm lá lớn để chọn. Lá úp chưa biết vẫn được giữ bí mật.');$('#modal')._inspection={seat,signature:inspectionSignature(seat)};if(!selectable)$('#modal').querySelector?.('.modalbuttons [data-act="close"]')?.remove?.();}
function refreshInspection(){const m=$('#modal'),i=m?._inspection;if(!i||!m.querySelector||m.classList.contains('hide'))return;const signature=inspectionSignature(i.seat);if(signature!==i.signature){const fields=m.querySelector('#formfields');if(fields)fields.innerHTML=inspectionFields(i.seat);i.signature=signature;}}

function inspectEquipment(index){const eq=state.hand[index];if(!eq)return;if(state.status==='finished')return showCardDetail(eq.name,eq.description,equipmentArt[eq.id]);if(state.pending?.kind==='discard'||(state.pending?.kind==='equipment-discard'&&state.pending.owner===state.me))return activateEquipment(index);
 modal(eq.name,`<div class="equipment-detail">${renderGear(eq,index).replace(/<button[^>]*>/,'<div class="equipment gear-card physical-gear">').replace(/<\/button>$/,'</div>')}</div>`,'Dùng trang bị',()=>{if(state.hand[index]?.id!==eq.id)return notif('Trang bị đã thay đổi. Hãy chọn lại.');if(['vest','smoke','coffee','camera','database','metal'].includes(eq.id))return send({type:'playEquipment'});activateEquipment(index);},'Trang bị của riêng bạn · Máy chủ xác nhận mọi tác dụng.');}

function render(){
 const pend=state?.pending;
 const context=state?JSON.stringify([state.code,state.status,state.turn,state.phase,pend?.kind,pend?.decisionId,pend?.target,pend?.shooter,pend?.victim,pend?.since]):null;
 if(context!==interactionContext){pick=null;confirmation=null;const m=$('#modal');m.classList.add('hide');m._callback=null;interactionContext=context;}
 if(pick&&(!state?.hand.some(eq=>eq.id===pick.id)||(pick.selected!==undefined&&!state.players[pick.selected]?.alive))){pick=null;confirmation=null;$('#modal').classList.add('hide');$('#modal')._callback=null;}
 if(state?.pending&&!['shot'].includes(state.pending.kind))pick=null;
 if(!state){root.className='';home();return;}if(state.status==='lobby'){root.className='';lobby();}else board();refreshInspection();if(root.dataset){root.dataset.interactionState=interactionState();root.dataset.busy=String(busy);}}
function modal(title,fields,submitText,callback,desc=''){if(!document.activeElement?.closest?.('#modal'))modalTrigger=document.activeElement;confirmation=confirmation||'SELECT_PLAYER';const m=$('#modal');m._inspection=null;m.classList.remove('hide');m.innerHTML=`<section class="modal" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="eyebrow">LỆNH TÁC CHIẾN</div><h3>${esc(title)}</h3>${desc?`<p>${esc(desc)}</p>`:''}<div id="formfields">${fields}</div><div class="modalbuttons">${buttons('Huỷ','close','ghost')}${buttons(esc(submitText),'confirm','primary')}</div></section>`;m._callback=callback;m.querySelector?.('.modal')?.focus?.();if(root.dataset)root.dataset.interactionState=interactionState();}
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
 case 'shoot':if(!canShoot())return notif('Bạn cần ngắm mục tiêu sống và súng đã sẵn sàng.');return confirmPlay('Xác nhận nổ súng','Các trang bị phản ứng được xử lý trước phát bắn.',()=>send({type:'actionShoot'}));
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
 if(id==='serum')return playerSlotPrompt(eq.name,all.filter(x=>cardOptions(x.v).length),v=>send({type:'playEquipment',...v}));
 if(id==='wiretap'||id==='blackmail'||id==='confiscation'||id==='evidence'){
  const targets=id==='confiscation'?armed:id==='evidence'?targetOptions(p=>p.alive&&p.seat!==state.me&&p.handCount):others;const second=id==='confiscation'?noGun:others;
  if(!targets.length||!second.length)return notif('Chưa có đủ mục tiêu hợp lệ.');
  let fields=field('Mục tiêu 1','target',targets);if(!['confiscation','evidence'].includes(id))fields+=field('Lá của người thứ nhất','slot',cardOptions(Number(targets[0].v),id==='wiretap'));
  fields+=field('Mục tiêu 2','target2',second);if(!['confiscation','evidence'].includes(id))fields+=field('Lá của người thứ hai','slot2',cardOptions(Number(second[0].v),id==='wiretap'));
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
function showCardDetail(title,desc,art){if(!document.activeElement?.closest?.('#modal'))modalTrigger=document.activeElement;const m=$('#modal');m._inspection=null;m.classList.remove('hide');m.innerHTML=`<section class="modal card-inspect" tabindex="-1" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="eyebrow">HỒ SƠ CHI TIẾT</div><div class="inspector-art">${detailArtwork(art)}</div><h3>${esc(title)}</h3><p>${esc(desc)}</p><div class="modalbuttons">${buttons('Đóng','close','primary')}</div></section>`;m.querySelector?.('.modal')?.focus?.();}
function finishEquipment(rest){if(!pick||pick.kind!=='equipment')return;const eq=state.hand.find(e=>e.id===pick.id);return confirmPlay('Dùng '+(eq?.name||pick.id),[rest.target,rest.target2].filter(x=>x!==undefined).map((x,i)=>`#${Number(x)+1} · ${state.players[Number(x)].name}${(i?rest.slot2:rest.slot)!==undefined?' · lá '+(Number(i?rest.slot2:rest.slot)+1):''}`).join(' → ')+' · Xác nhận sử dụng trang bị?',()=>{if(busy)return;if(!state.hand.some(e=>e.id===eq?.id))return notif('Trang bị đã thay đổi. Hãy chọn lại.');pick=null;send({type:'playEquipment',...rest});});}
function handleCardClick(seat,slot){
  if(busy)return;
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
  if(state.status==='playing'&&state.turn===state.me&&state.phase==='action'&&!state.pending&&p.alive&&!c.shown&&!p.effects.disguise&&!state.known[`${p.id}:${slot}`]){
    return confirmPlay('Điều tra lá bài',`Bạn muốn dùng hành động chính để xem lá ${slot+1} của ${p.name}? Chỉ mình bạn biết kết quả.`,()=>send({type:'actionInvestigate',target:seat,slot}));
  }
  const known=state.known[`${p.id}:${slot}`];const type=c.type||known?.type;
  showCardDetail(type?label[type]:'HỒ SƠ CHƯA XÁC MINH',type?`Ghế ${seat+1}, lá ${slot+1}. ${c.shown?'Công khai':'Bạn đã từng điều tra'}`:'Danh tính này chưa được tiết lộ. Không thể xem bài bí mật của đối thủ.',type?cardSeal(type):'◎');
}
function handleSeatClick(seat){
  if(busy)return;
  const target=state.players[seat],me=state.players[state.me];if(!target)return;
  if(pick?.kind==='equipment'){
    if(!eligibleSeat(seat))return notif('Mục tiêu chưa hợp lệ. Hãy chọn mục tiêu được viền sáng.');
    const id=pick.id;
    if(['wiretap','blackmail','bribe'].includes(id))return notif('Hãy chạm trực tiếp vào lá danh tính của người chơi.');
    if(id==='confiscation'||id==='evidence'){
      if(pick.selected===undefined){pick.selected=seat;render();return;}
      return finishEquipment({target:pick.selected,target2:seat});
    }
    return finishEquipment({target:seat});
  }
  if(seat===state.me&&!pick)return inspectSeat(seat);
  if(state.status!=='playing'||state.turn!==state.me||state.pending||!target.alive||seat===state.me)return inspectSeat(seat);
  if(state.phase==='aim'&&me.gun)return send({type:'chooseAim',target:seat});
  if(state.phase==='action'&&me.gun&&me.aim===seat&&!me.gunFresh)return confirmPlay('Xác nhận nổ súng',`Bắn ${target.name}? Các trang bị phản ứng sẽ được xử lý trước khi phát bắn có hiệu lực.`,()=>send({type:'actionShoot'}));
  return inspectSeat(seat);
}
function activateEquipment(index=0){
  if(busy)return;
  if(!state?.hand?.[index])return;
  if((state.pending?.kind==='discard'&&state.turn===state.me)||(state.pending?.kind==='equipment-discard'&&state.pending.owner===state.me)){return confirmPlay('Bỏ trang bị',`Bỏ ${state.hand[index].name} và giữ lại lá khác?`,()=>send({type:'discardHand',index}));}
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
let suppressClickUntil=0;
root.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
root.addEventListener('click',e=>{const guide=e.target.closest('[data-role-guide]');if(guide){const entry=ROLE_GUIDE.find(r=>r.type===guide.dataset.roleGuide);if(entry)showCardDetail(entry.name,entry.description,cardSeal(entry.type));return;}const info=e.target.closest('[data-seat-info]');if(info){e.stopImmediatePropagation();inspectSeat(Number(info.dataset.seatInfo));}const mem=e.target.closest('[data-memory-card]');if(mem){const [seat,slot]=mem.dataset.memoryCard.split(':').map(Number);const p=state.players[seat],type=seat===state.me?state.myCards[slot]?.type:p.cards[slot].type||state.known[`${p.id}:${slot}`]?.type;showCardDetail(type?label[type]:'Chưa biết',`Ghế ${seat+1} · Lá ${slot+1}`,type?cardSeal(type):'◎');}});
root.addEventListener('click',e=>{
  const el=e.target.closest('[data-pick-card], [data-pick-seat], [data-select-person], [data-own-card], [data-board-item], [data-eqcard-index]');if(!el)return;
  if(!state||!['playing','finished'].includes(state.status))return;
  if(el.hasAttribute('data-pick-card')){e.preventDefault();e.stopPropagation();const [s,k]=el.dataset.pickCard.split(':').map(Number);return handleCardClick(s,k);}
  if(el.hasAttribute('data-own-card'))return handleOwnCard(Number(el.dataset.ownCard));
  if(el.hasAttribute('data-eqcard-index'))return inspectEquipment(Number(el.dataset.eqcardIndex));
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
root.addEventListener('pointerdown',e=>{const el=e.target.closest('[data-eqcard-index],[data-pick-card],[data-own-card]');if(!el||e.pointerType==='mouse')return;holdOrigin={x:e.clientX,y:e.clientY};clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>{hoverTimer=null;suppressClickUntil=Date.now()+600;const evt=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});el.dispatchEvent(evt);},750);});
for(const ev of ['pointerup','pointercancel'])root.addEventListener(ev,()=>{holdOrigin=null;if(hoverTimer){clearTimeout(hoverTimer);hoverTimer=null;}});
root.addEventListener('pointermove',e=>{if(holdOrigin&&Math.hypot(e.clientX-holdOrigin.x,e.clientY-holdOrigin.y)>8){clearTimeout(hoverTimer);hoverTimer=null;holdOrigin=null;}});
root.addEventListener('dragstart',e=>{const el=e.target.closest('[data-board-item],[data-eqcard-index],[data-drag-gun]');if(!el)return;dragged={kind:el.hasAttribute('data-board-item')?'board':el.hasAttribute('data-eqcard-index')?'gear':'gun',value:el.dataset.boardItem||el.dataset.eqcardIndex||el.dataset.dragGun};e.dataTransfer?.setData('text/plain',JSON.stringify(dragged));});
root.addEventListener('dragover',e=>{if(e.target.closest('[data-pick-seat],[data-select-person],[data-pick-card],[data-own-card]'))e.preventDefault();});
root.addEventListener('drop',e=>{e.preventDefault();const seatEl=e.target.closest('[data-pick-seat],[data-select-person]'),cardEl=e.target.closest('[data-pick-card]');if(!dragged)return;const drag=dragged;dragged=null;
  if(drag.kind==='board')return handleBoardItem(drag.value);
  if(drag.kind==='gun'&&seatEl)return handleSeatClick(Number(seatEl.dataset.pickSeat??seatEl.dataset.selectPerson));
  if(drag.kind==='gear'){activateEquipment(Number(drag.value));if(!state.hand[Number(drag.value)])return;if(cardEl){const [seat,slot]=cardEl.dataset.pickCard.split(':').map(Number);return handleCardClick(seat,slot);}if(seatEl)return handleSeatClick(Number(seatEl.dataset.pickSeat??seatEl.dataset.selectPerson));}
});
root.addEventListener('click',async e=>{const button=e.target.closest('[data-act]');if(!button)return;const action=button.dataset.act;
 if(action.startsWith('drawer-')){drawer=action==='drawer-close'?null:action.slice(7);renderDrawer();if(drawer==='chat')$('#chat')?.focus();else if(drawer)$('#info-drawer button')?.focus();return;}
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
$('#modal').addEventListener('click',e=>{const card=e.target.closest('[data-inspect-card]');if(card){const [seat,slot]=card.dataset.inspectCard.split(':').map(Number);$('#modal').classList.add('hide');return handleCardClick(seat,slot);}const action=e.target.closest('[data-act]')?.dataset.act;if(action==='close'||e.target===$('#modal')){confirmation=null;$('#modal').classList.add('hide');$('#modal')._callback=null;if(root.dataset)root.dataset.interactionState=interactionState();(modalTrigger?.id?$('#'+modalTrigger.id):modalTrigger)?.focus?.({preventScroll:true});}if(action==='confirm'){const cb=$('#modal')._callback;$('#modal')._callback=null;confirmation=null;$('#modal').classList.add('hide');cb?.();}});
// Keep rendering separate from modals: action response arrives through SSE after server validation.
const code=codeFromURL();if(code&&localStorage.getItem('sd-'+code)){session={code,token:localStorage.getItem('sd-'+code)};connect();}else home();

// Update text only: never replace focused controls while a deadline ticks.
function updateCountdowns(){if(typeof document.querySelectorAll!=='function')return;for(const el of document.querySelectorAll('[data-countdown]'))el.textContent=String(Math.max(0,Math.ceil((Number(el.dataset.countdown)-Date.now())/1000)));for(const el of document.querySelectorAll('[data-force-at]'))el.disabled=Date.now()<Number(el.dataset.forceAt);}
if(typeof setInterval==='function')setInterval(updateCountdowns,250);

if(typeof window.addEventListener==='function'){
 window.addEventListener('offline',()=>{connection='reconnecting';stream?.close();if(state)render();});
 window.addEventListener('online',()=>{if(session)connect();});
 window.addEventListener('resize',()=>{if(state&&state.status!=='lobby')drawAimLines();});
 window.addEventListener('keydown',e=>{if(e.key==='Tab'){const overlay=!$('#modal').classList.contains('hide')?$('#modal'):drawer&&state?.pending?.kind!=='shot'?$('#info-drawer'):null;const items=overlay?[...overlay.querySelectorAll('button:not(:disabled),input,select,[href]')]:[];if(items.length){const first=items[0],last=items.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('.modal'))){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}if(e.key==='Escape'){confirmation=null;$('#modal').classList.add('hide');drawer=null;renderDrawer();(modalTrigger?.id?$('#'+modalTrigger.id):modalTrigger)?.focus?.({preventScroll:true});}});
}
