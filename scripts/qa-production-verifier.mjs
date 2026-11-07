// Exercise the exact post-deploy browser verifier before a release, against the unchanged local server.
import {createLocalServer} from '../server.mjs';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
const server=createLocalServer(),handle=server.listeners('request')[0];server.removeAllListeners('request');
server.on('request',(req,res)=>{if(req.url.split('?')[0]==='/api/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true,service:'diep-vien-so-dach-online',version:JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version,commit:process.env.GITHUB_SHA||null}));}else handle(req,res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{
 const child=spawn(process.execPath,['scripts/production-ui-smoke.mjs'],{stdio:'inherit',env:{...process.env,PRODUCTION_SMOKE_BASE:`http://127.0.0.1:${server.address().port}`}});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});if(code!==0)throw Error('Production browser verifier rehearsal failed');
}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
