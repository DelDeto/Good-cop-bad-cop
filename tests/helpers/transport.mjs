import {createLocalServer} from '../../server.mjs';
import {fixture} from './fixtures.mjs';
import {loadWorker} from './worker.mjs';
export async function transport(kind,t,seed=fixture()){
 if(kind==='local'){
  const rooms=new Map([[seed.code,seed]]),server=createLocalServer({rooms});
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
  t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));});
  return {get game(){return rooms.get(seed.code);},request:(path,body)=>fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body?'POST':'GET',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(5000)}),restart(){throw Error('local rooms intentionally in-memory');}};
 }
 const {default:worker,GameRoom}=await loadWorker();let saved=structuredClone(seed),alarmAt,instance;
 const storage={get:async()=>structuredClone(saved),put:async(k,v)=>{saved=structuredClone(v);},setAlarm:async at=>{alarmAt=at;},deleteAll:async()=>{saved=undefined;}};
 const rebuild=()=>{instance=new GameRoom({storage},{});};rebuild();
 const env={GAME_ROOMS:{idFromName:n=>n,get:()=>({fetch:r=>instance.fetch(r)})}};
 return {get game(){return saved;},get alarmAt(){return alarmAt;},restart:rebuild,alarm:()=>instance.alarm(),request:(path,body)=>worker.fetch(new Request('https://game.test'+path,body?{method:'POST',body:JSON.stringify(body)}:undefined),env)};
}
