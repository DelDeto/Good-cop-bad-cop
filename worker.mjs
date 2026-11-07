import {createRoom,joinRoom,command,view,botStep,needsBotStep,pendingDeadline,resolveTimedPending} from './src/engine.mjs';
import html from './assets/index.txt';
import appJS from './assets/app.txt';
import styles from './assets/style.txt';
import favicon from './assets/favicon.txt';
import tableB64 from './assets/table-b64.txt';
import itemArtB64 from './assets/item-art-b64.txt';
import portraitsB64 from './assets/portraits-b64.txt';
import rolesB64 from './assets/roles-b64.txt';
import cardBackB64 from './assets/card-back-b64.txt';
import artManifest from './assets/art-manifest.txt';

const encoder = new TextEncoder();
const code = ()=>{const a=new Uint8Array(3);crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();};
const token=()=>{const a=new Uint8Array(24);crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(2,'0')).join('');};
const safe=s=>String(s||'').trim().replace(/[<>]/g,'').slice(0,24);
const response=(object,status=200)=>new Response(JSON.stringify(object),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const err=(message,status=400)=>response({error:message},status);
const input=async req=>{const s=await req.text();if(s.length>12000)throw Error('Yêu cầu quá lớn.');return JSON.parse(s||'{}');};
const normalize=c=>String(c||'').replace(/[^a-z0-9]/gi,'').toUpperCase();

export class GameRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;this.connections=new Set();this.operation=Promise.resolve();}
  // Serialize read/modify/write across fetch and alarm, including rejected commands.
  exclusive(action){const next=this.operation.then(action);this.operation=next.catch(()=>{});return next;}
  fetch(req){return this.exclusive(()=>this.handleFetch(req));}
  alarm(){return this.exclusive(()=>this.handleAlarm());}
  async schedule(game){
    const expiry=game.createdAt+24*60*60*1000;
    const deadline=pendingDeadline(game);
    let next=expiry;
    if(needsBotStep(game))next=Math.min(next,Date.now()+1300);
    else if(deadline!==null)next=Math.min(next,Math.max(Date.now()+1000,deadline));
    await this.ctx.storage.setAlarm(next);
  }
  async handleFetch(req){
    const url=new URL(req.url),op=url.pathname;let game=await this.ctx.storage.get('game');
    try{
      if(op==='/create'){
        if(game)return err('Mã phòng đã tồn tại.',409);
        const d=await input(req),name=safe(d.name),room=normalize(d.code);if(!name||room.length!==6)return err('Tên hoặc mã phòng không hợp lệ.');
        const t=token();game=createRoom(room,name,t);await this.ctx.storage.put('game',game);
        await this.schedule(game);
        return response({code:room,token:t});
      }
      if(!game)return err('Không tìm thấy phòng.',404);
      // Persist recovery before processing stale/invalid requests as well as reads.
      if(resolveTimedPending(game)){
        await this.ctx.storage.put('game',game);
        await this.schedule(game);this.notify(game);
      }
      if(op==='/join'){
        const d=await input(req);let t=String(d.token||'').trim();
        if(!game.players.some(p=>p.token===t)){
          const name=safe(d.name);if(!name)return err('Vui lòng nhập tên.');
          t=token();joinRoom(game,name,t);
          await this.ctx.storage.put('game',game);
          await this.schedule(game);
          this.notify(game);
        }
        return response({code:game.code,token:t});
      }
      if(op==='/command'){
        const d=await input(req);command(game,d.token,d.command);
        await this.ctx.storage.put('game',game);
        await this.schedule(game);
        this.notify(game);
        return response({ok:true,state:view(game,d.token)});
      }
      if(op==='/state')return response(view(game,url.searchParams.get('token')));
      if(op==='/events'){
        const t=url.searchParams.get('token');const initial=view(game,t);
        const {readable,writable}=new TransformStream();const writer=writable.getWriter();
        const connection={writer,token:t};this.connections.add(connection);
        writer.write(encoder.encode(`data: ${JSON.stringify(initial)}\n\n`)).catch(()=>this.connections.delete(connection));
        return new Response(readable,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no','Access-Control-Allow-Origin':'*'}});
      }
      return err('Không có endpoint.',404);
    }catch(e){return err(e?.message||'Lỗi xử lý phòng.');}
  }
  notify(game){
    for(const conn of this.connections){
      try{const data=`data: ${JSON.stringify(view(game,conn.token))}\n\n`;
      conn.writer.write(encoder.encode(data)).catch(()=>this.connections.delete(conn));}
      catch{this.connections.delete(conn);}
    }
  }
  async handleAlarm(){
    const game=await this.ctx.storage.get('game');
    if(!game)return;
    if(Date.now()>=game.createdAt+24*60*60*1000){await this.ctx.storage.deleteAll();this.connections.clear();return;}
    let changed=resolveTimedPending(game);
    if(!changed&&needsBotStep(game))changed=botStep(game);
    if(changed){await this.ctx.storage.put('game',game);this.notify(game);}
    await this.schedule(game);
  }
}

function asset(body,type){return new Response(body,{status:200,headers:{'Content-Type':type,'Cache-Control':'no-cache, must-revalidate','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN'}});}
export default {
  async fetch(req,env){
    const url=new URL(req.url),path=url.pathname;
    if(req.method==='GET'){
      if(path==='/'||path==='/index.html')return asset(html,'text/html; charset=utf-8');
      if(path==='/app.js')return asset(appJS,'text/javascript; charset=utf-8');
      if(path==='/style.css')return asset(styles,'text/css; charset=utf-8');
      if(path==='/favicon.svg')return asset(favicon,'image/svg+xml');
      if(path==='/item-art.webp')return new Response(Uint8Array.from(atob(itemArtB64),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=604800,immutable'}});
      if(path==='/board-texture.webp')return new Response(Uint8Array.from(atob(tableB64),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=604800,immutable'}});
      if(path==='/portraits.webp')return new Response(Uint8Array.from(atob(portraitsB64),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=604800,immutable'}});
      if(path==='/roles.webp')return new Response(Uint8Array.from(atob(rolesB64),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=604800,immutable'}});
      if(path==='/card-back.webp')return new Response(Uint8Array.from(atob(cardBackB64),c=>c.charCodeAt(0)),{headers:{'Content-Type':'image/webp','Cache-Control':'public,max-age=604800,immutable'}});
      if(path==='/art-manifest.json')return asset(artManifest,'application/json; charset=utf-8');
      if(path==='/api/health')return response({ok:true,version:'1.7.0-responsive-table',service:'diep-vien-so-dach-online'});
    }
    if(!path.startsWith('/api/'))return err('Not found.',404);
    let c,op,body=null;
    if(req.method==='POST'){
      try{body=await input(req);}catch(e){return err('Yêu cầu JSON không hợp lệ.');}
      if(path==='/api/create'){
        if(!safe(body.name))return err('Hãy nhập tên.');
        for(let i=0;i<10;i++){
          c=code();const target=env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(c));
          const resp=await target.fetch(new Request('https://game.internal/create',{method:'POST',body:JSON.stringify({...body,code:c})}));
          if(resp.status===409)continue;return resp;
        }
        return err('Không thể tạo mã phòng.',503);
      }
      c=normalize(body.code);op=path==='/api/join'?'join':path==='/api/command'?'command':null;
    }else if(req.method==='GET'){
      c=normalize(url.searchParams.get('code'));op=path==='/api/state'?'state':path==='/api/events'?'events':null;
    }
    if(!op)return err('Endpoint không tồn tại.',404);
    if(c.length!==6)return err('Mã phòng phải có 6 ký tự.');
    const target=env.GAME_ROOMS.get(env.GAME_ROOMS.idFromName(c));
    const internal=`https://game.internal/${op}${req.method==='GET'?url.search:''}`;
    return target.fetch(new Request(internal,{method:req.method,body:req.method==='POST'?JSON.stringify(body):undefined}));
  }
};
