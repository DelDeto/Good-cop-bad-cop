import {readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {bundle,validateTag,savePackage,policy} from './package.mjs';
import {Cloudflare,smoke} from './cloudflare.mjs';
const mode=process.argv[2],dir=process.env.RELEASE_OUTPUT_DIR||'/tmp/gcbc-release';mkdirSync(dir,{recursive:true});
const file=dir+'/report.json',load=()=>JSON.parse(readFileSync(file)),save=r=>{writeFileSync(file,JSON.stringify(r,null,2)+'\n');};
const cf=()=>new Cloudflare({account:process.env.CLOUDFLARE_ACCOUNT_ID,token:process.env.CLOUDFLARE_API_TOKEN});
const sha=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const isRelease=process.env.GITHUB_REF_TYPE==='tag';
try{
 if(mode==='inspect'){
  const pkg=isRelease?validateTag(process.env.GITHUB_REF_NAME,sha):bundle(sha);
  const report={status:'PENDING',mode:isRelease?'release':'setup',worker:policy.worker,url:policy.url,sha,version:pkg.version,runUrl:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,tests:'PASS',dryRun:'PENDING',startedAt:new Date().toISOString()};save(report);
  const api=cf();report.baseline=await api.inspect();report.baselineSmoke=await smoke(pkg,{baseline:true});
  savePackage(pkg,dir+'/package');
  // A compiler-only dry run; Wrangler is never used to mutate production settings.
  writeFileSync(dir+'/package/wrangler.json',JSON.stringify({name:policy.worker,main:'worker.mjs',compatibility_date:report.baseline.shape.runtime.compatibility_date,compatibility_flags:report.baseline.shape.runtime.compatibility_flags,rules:[{type:'Text',globs:['**/*.txt'],fallthrough:true}],durable_objects:{bindings:[{name:'GAME_ROOMS',class_name:'GameRoom'}]}},null,2));
  save(report);console.log('PASS: read-only Worker configuration and production baseline smoke; packaging ready');
 }else if(mode==='dry-run-passed'){
  const report=load();report.dryRun='PASS';report.status='PASS';report.completedAt=new Date().toISOString();save(report);
 }else if(mode==='deploy'){
  if(!isRelease)throw Error('Production deployment requires a release tag');
  const pkg=validateTag(process.env.GITHUB_REF_NAME,sha),report=load(),api=cf();
  if(report.dryRun!=='PASS'||report.sha!==sha)throw Error('Dry run missing for this commit');
  const setup=JSON.parse(readFileSync(process.env.SETUP_REPORT_FILE));
  if(setup.status!=='PASS'||setup.dryRun!=='PASS'||setup.worker!==policy.worker||setup.baseline?.fingerprint!==report.baseline.fingerprint)throw Error('Initial setup has not passed for this production configuration');
  const current=await api.inspect();if(current.id!==report.baseline.id||current.fingerprint!==report.baseline.fingerprint)throw Error('Production changed since preflight');
  report.status='UPLOADING';save(report);
  report.candidate=await api.upload(report.baseline,pkg);report.status='UPLOADED';save(report);
  // A durable checkpoint is uploaded by the workflow BEFORE activation.
 }else if(mode==='activate'){
  if(!isRelease)throw Error('Production activation requires a release tag');
  validateTag(process.env.GITHUB_REF_NAME,sha);
  const report=load(),api=cf(),current=await api.inspect();
  if(report.status!=='UPLOADED'||report.sha!==sha||current.id!==report.baseline.id||current.fingerprint!==report.baseline.fingerprint)throw Error('Activation preconditions changed');
  report.status='ACTIVATING';save(report);report.deployment=await api.activate(report.candidate);save(report);
  if(await api.active()!==report.candidate)throw Error('Activation could not be verified');
  let result,lastError;
  for(let i=0;i<6;i++){try{result=await smoke(bundle(sha));break;}catch(e){lastError=e;await new Promise(r=>setTimeout(r,5000));}}
  if(!result)throw lastError;
  if(await api.active()!==report.candidate)throw Error('Concurrent deployment during smoke');
  report.smoke=result;report.status='PASS';report.deployed=true;report.completedAt=new Date().toISOString();save(report);
  console.log('PASS: production version, commit SHA and all frontend asset hashes');
 }else if(mode==='recover'){
  const report=load();if(report.deployed&&report.status==='PASS')process.exit(0);
  report.status='FAIL';
  if(report.candidate){report.rollback=await cf().rollback(report);const baseline=await smoke(bundle(sha),{baseline:true});
   if(JSON.stringify(baseline)!==JSON.stringify(report.baselineSmoke))throw Error('Rollback content differs from verified pre-release baseline');
   report.rollback.smoke='PASS';}
  save(report);
 }else if(mode==='summary'){
  const r=existsSync(file)?load():{status:'FAIL',reason:'Preflight failed before a complete report was available'};
  if(r.status==='PENDING')r.status='FAIL';
  if(process.env.RELEASE_JOB_STATUS==='failure'&&!(r.deployed&&r.status==='PASS'))r.status='FAIL';save(r);
  const text=`Release automation: ${r.status}\n\nMode: ${r.mode||'setup'}\nVersion: ${r.version||'unknown'}\nCommit: ${r.sha||sha}\nWorker: ${policy.worker}\nURL: ${policy.url}\nDry run: ${r.dryRun||'NOT VERIFIED'}\nCandidate version: ${r.candidate||'none'}\nDeployment ID: ${r.deployment?.id||'none'}\nRollback baseline: ${r.baseline?.id||'NOT VERIFIED'}\nRollback: ${r.rollback?.status||'not needed'}\nProduction deployed: ${r.deployed?'yes':'no'}\nActions: ${r.runUrl||'unknown'}\n`;
  writeFileSync(dir+'/report.md',text);if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,text);console.log(text);
 }else throw Error('Unknown release mode');
}catch(e){
 if(existsSync(file)){const r=load();r.status='FAIL';r.error=e.message;save(r);}
 console.error(e.message);process.exitCode=1;
}
