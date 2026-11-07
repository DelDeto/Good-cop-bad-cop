import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assetFiles} from '../asset-map.mjs';
import {execFileSync} from 'node:child_process';
export const hash=data=>createHash('sha256').update(data).digest('hex');
export const policy=JSON.parse(readFileSync(new URL('./policy.json',import.meta.url)));
export const read=file=>readFileSync(new URL('../../'+file,import.meta.url));
export function bundle(sha){
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid commit SHA');
 const source=read('worker.mjs').toString(),engine=read('src/engine.mjs');
 const room=source.slice(source.indexOf('export class GameRoom {'),source.indexOf('\nfunction asset('));
 if(hash(engine)!==policy.engineSha256||hash(room)!==policy.gameRoomSha256)throw Error('UI release changes protected gameplay or Durable Object implementation');
 const backend=source.slice(source.indexOf('const encoder'),source.indexOf('export class GameRoom'))+source.slice(source.indexOf("    if(!path.startsWith('/api/'))"));
 if(hash(backend)!==policy.apiSha256||hash(read('server.mjs'))!==policy.serverSha256)throw Error('UI release changes protected API, privacy or local server');
 const version=JSON.parse(read('package.json')).version;
 const replacement=`return response({ok:true,version:'${version}',commit:'${sha}',service:'${policy.worker}'});`;
 const health=/return response\(\{ok:true,version:'[^']+',service:'diep-vien-so-dach-online'\}\);/g;
 if([...source.matchAll(health)].length!==1)throw Error('Health metadata injection must match exactly once');
 const modules=[{name:'worker.mjs',type:'application/javascript+module',body:source.replace(health,replacement)},{name:'src/engine.mjs',type:'application/javascript+module',body:engine}];
 for(const m of source.matchAll(/from '(\.\/assets\/[^']+\.txt)'/g))modules.push({name:m[1].slice(2),type:'text/plain',body:read(m[1].slice(2))});
 if(modules.length!==assetFiles.length+2)throw Error('Review packaging for changed module imports');
 const assets=assetFiles.map(([name])=>({path:name==='index.html'?'/':'/'+name,sha256:hash(read('public/'+name))}));
 return {version,sha,modules,assets};
}
export function validateTag(tag,sha,git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim(),readManifest=()=>JSON.parse(read('release.json'))){
 const pkg=bundle(sha);
 if(!/^v\d+\.\d+\.\d+$/.test(tag)||tag!=='v'+pkg.version)throw Error('Release tag must exactly match package.json semver');
 const head=git('rev-parse','refs/remotes/origin/'+policy.sourceBranch);
 if(head!==sha)throw Error('Release must point to the current release source branch, never stale main');
 git('merge-base','--is-ancestor',policy.approvedBase,sha);
 const manifest=readManifest();
 if(manifest.version!==pkg.version||manifest.status!=='complete'||manifest.scope!=='ui'||manifest.sourceBranch!==policy.sourceBranch)throw Error('Missing completed UI release manifest');
 return pkg;
}
export function savePackage(pkg,dir){
 mkdirSync(dir,{recursive:true});
 for(const m of pkg.modules){mkdirSync(dir+'/'+m.name.split('/').slice(0,-1).join('/'),{recursive:true});writeFileSync(dir+'/'+m.name,m.body);}
 writeFileSync(dir+'/manifest.json',JSON.stringify({...pkg,modules:pkg.modules.map(m=>({name:m.name,type:m.type,sha256:hash(m.body)}))},null,2));
}
