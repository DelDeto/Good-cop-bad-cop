// Public operational evidence only. Never persist API responses, bindings' values, tokens or room state.
import {readFileSync} from 'node:fs';
const dir=process.env.RELEASE_OUTPUT_DIR,report=JSON.parse(readFileSync(dir+'/report.json'));
const repo=process.env.GITHUB_REPOSITORY,token=process.env.GH_TOKEN;
const api=async(path,method='GET',body)=>{
 const r=await fetch(`https://api.github.com/repos/${repo}/${path}`,{method,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},body:body?JSON.stringify(body):undefined});
 const j=await r.json();if(!r.ok)throw Error(`GitHub report API HTTP ${r.status}`);return j;
};
const branch='automation/deployment-state';
let ref;try{ref=await api('git/ref/heads/'+branch);}catch{ref=await api('git/refs','POST',{ref:'refs/heads/'+branch,sha:process.env.GITHUB_SHA});}
async function put(path,content){
 let previous;try{previous=await api(`contents/${path}?ref=${encodeURIComponent(branch)}`);}catch{}
 await api('contents/'+path,'PUT',{message:`ci: record ${report.mode} ${report.status}`,branch,content:Buffer.from(content).toString('base64'),...(previous?{sha:previous.sha}:{})});
}
await put('deployment-state/latest.json',JSON.stringify(report,null,2)+'\n');
await put('deployment-state/runs/'+process.env.GITHUB_RUN_ID+'.json',JSON.stringify(report,null,2)+'\n');
if(report.mode==='setup'&&report.status==='PASS')await put('deployment-state/setup.json',JSON.stringify(report,null,2)+'\n');
if(report.deployed&&report.status==='PASS'){
 await put('deployment-state/last-success.json',JSON.stringify(report,null,2)+'\n');
 const tag=process.env.GITHUB_REF_NAME;let release;try{release=await api('releases/tags/'+tag);}catch{}
 const body=readFileSync(dir+'/report.md','utf8');
 if(release)await api('releases/'+release.id,'PATCH',{body});else await api('releases','POST',{tag_name:tag,target_commitish:report.sha,name:tag,body,draft:false,prerelease:false});
}
console.log('Published sanitized deployment evidence to '+branch);
