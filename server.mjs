import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRoom,joinRoom,command,view,botStep,needsBotStep,shotDeadline,resolveTimedShot} from './src/engine.mjs';
const DIR=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const PORT=Number(process.env.PORT||8787), rooms=new Map(), watchers=new Map(), botTimers=new Map();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const json=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
const token=()=>crypto.randomBytes(24).toString('hex');
const randomCode=()=>crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();
const safe=(s)=>String(s||'').trim().replace(/[<>]/g,'').slice(0,24);
function broadcast(code){const game=rooms.get(code);if(!game)return;for(const w of watchers.get(code)||[]){try{w.res.write(`data: ${JSON.stringify(view(game,w.token))}\n\n`);}catch{}}}
function scheduleRoom(code){
  const old=botTimers.get(code);if(old)clearTimeout(old);botTimers.delete(code);
  const game=rooms.get(code);if(!game)return;
  const deadline=shotDeadline(game);
  let delay=needsBotStep(game)?1300:deadline===null?null:Math.max(1000,deadline-Date.now());
  if(delay===null)return;
  const t=setTimeout(()=>{
    botTimers.delete(code);const latest=rooms.get(code);if(!latest)return;
    const changed=needsBotStep(latest)?botStep(latest):resolveTimedShot(latest);
    if(changed)broadcast(code);
    scheduleRoom(code);
  },delay);t.unref?.();botTimers.set(code,t);
}
async function body(req){let b='';for await(const chunk of req){b+=chunk;if(b.length>10000)throw Error('Yêu cầu quá lớn.');}return JSON.parse(b||'{}');}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='POST'&&url.pathname==='/api/create'){
   const data=await body(req);const name=safe(data.name);if(!name)return json(res,400,{error:'Hãy nhập tên.'});let code;do{code=randomCode();}while(rooms.has(code));const t=token();rooms.set(code,createRoom(code,name,t));return json(res,200,{code,token:t});
  }
  if(req.method==='POST'&&url.pathname==='/api/join'){
   const d=await body(req),code=String(d.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'');const game=rooms.get(code);if(!game)return json(res,404,{error:'Không tìm thấy mã phòng.'});const t=String(d.token||'').trim()||token();if(!game.players.some(p=>p.token===t)){const n=safe(d.name);if(!n)return json(res,400,{error:'Hãy nhập tên.'});joinRoom(game,n,t);}broadcast(code);return json(res,200,{code,token:t});
  }
  if(req.method==='POST'&&url.pathname==='/api/command'){
   const d=await body(req),code=String(d.code||'').toUpperCase();const game=rooms.get(code);if(!game)return json(res,404,{error:'Không tìm thấy phòng.'});command(game,d.token,d.command);broadcast(code);scheduleRoom(code);return json(res,200,{ok:true,state:view(game,d.token)});
  }
  if(req.method==='GET'&&url.pathname==='/api/state'){
   const code=String(url.searchParams.get('code')||'').toUpperCase(),game=rooms.get(code);if(!game)return json(res,404,{error:'Phòng không tồn tại.'});return json(res,200,view(game,url.searchParams.get('token')));
  }
  if(req.method==='GET'&&url.pathname==='/api/events'){
   const code=String(url.searchParams.get('code')||'').toUpperCase(),t=url.searchParams.get('token'),game=rooms.get(code);if(!game)return json(res,404,{error:'Phòng không tồn tại.'});const first=view(game,t);res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write(`data: ${JSON.stringify(first)}\n\n`);if(!watchers.has(code))watchers.set(code,new Set());const conn={res,token:t};watchers.get(code).add(conn);const pulse=setInterval(()=>{try{res.write(': ping\n\n');}catch{}},18000);req.on('close',()=>{clearInterval(pulse);watchers.get(code)?.delete(conn);});return;
  }
  if(req.method==='GET'){
   const raw=url.pathname==='/'?'/index.html':url.pathname;const f=path.resolve(DIR,'.'+decodeURIComponent(raw));if(!f.startsWith(DIR+path.sep))return json(res,403,{error:'Access denied'});let stat;try{stat=fs.statSync(f);}catch{return json(res,404,{error:'Not found'});}if(!stat.isFile())return json(res,404,{error:'Not a file'});res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});fs.createReadStream(f).pipe(res);return;
  }
  json(res,405,{error:'Method not allowed'});
 }catch(err){json(res,400,{error:err.message||'Đã xảy ra lỗi.'});}
});
setInterval(()=>{for(const [code,game] of rooms){if(Date.now()-game.createdAt>24*3600_000){rooms.delete(code);watchers.delete(code);clearTimeout(botTimers.get(code));botTimers.delete(code);}}},30*60_000).unref();
server.listen(PORT,'0.0.0.0',()=>console.log(`Điệp Viên Số Dách Online: http://localhost:${PORT}`));
