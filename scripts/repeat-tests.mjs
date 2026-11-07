// Repeat the entire suite. Every failure is retained and fails the command;
// this is stress validation, never a retry-until-green wrapper.
import {spawnSync} from 'node:child_process';
import {mkdirSync,readdirSync,writeFileSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),runs=Number(process.argv[2]||5),out=path.resolve(process.argv[3]||'/tmp/gcbc-repeat-tests');
if(!Number.isInteger(runs)||runs<1||runs>100)throw Error('Repetition count must be 1..100');
mkdirSync(out,{recursive:true});
const files=readdirSync(path.join(root,'tests')).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/'+f);
const commit=spawnSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).stdout.trim();
const results=[];let count,failed=false;
for(let i=1;i<=runs;i++){
 const run=spawnSync(process.execPath,['--test','--test-reporter=tap',...files],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:20*1024*1024});
 const log=(run.stdout||'')+(run.stderr||'')+(run.error?'\n'+run.error.message:'');writeFileSync(path.join(out,`run-${i}.tap`),log);
 const field=name=>{const m=(run.stdout||'').match(new RegExp('^# '+name+' (\\d+)','m'));return m?Number(m[1]):null;};
 const r={run:i,exitCode:run.status,tests:field('tests'),passed:field('pass'),failed:field('fail'),skipped:field('skipped'),cancelled:field('cancelled')};
 count??=r.tests;
 r.ok=run.status===0&&r.tests>=111&&r.tests===count&&r.passed===r.tests&&r.failed===0&&r.skipped===0&&r.cancelled===0;
 results.push(r);failed||=!r.ok;console.log(`run ${i}/${runs}: ${r.ok?'PASS':'FAIL'} ${r.passed}/${r.tests}`);
}
const summary={commit,node:process.version,repetitions:runs,testsPerRun:count,totalTests:results.reduce((n,r)=>n+(r.tests||0),0),status:failed?'FAIL':'PASS',results};
writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n### Repeated full suite ${process.version}: ${summary.status}\n\nCommit: ${commit}\n\n${runs} runs × ${count} tests; no failures or skips required.\n\n| Run | Result | Passed |\n|---|---|---|\n${results.map(r=>`| ${r.run} | ${r.ok?'PASS':'FAIL'} | ${r.passed}/${r.tests} |`).join('\n')}\n`);
console.log(JSON.stringify({node:summary.node,commit,status:summary.status,totalTests:summary.totalTests}));
process.exitCode=failed?1:0;
