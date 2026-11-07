// Uses only fresh QA rooms. Never joins or mutates an existing user's room.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {policy} from './release/package.mjs';
import {waitForArtwork} from './visual-audit.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const out=(process.env.RELEASE_OUTPUT_DIR||'/tmp/gcbc-release')+'/production';mkdirSync(out,{recursive:true});
const base=process.env.PRODUCTION_SMOKE_BASE||policy.url,expected=process.env.EXPECTED_VERSION||JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
if(base!==policy.url&&!base.startsWith('http://127.0.0.1:'))throw Error('Unexpected production smoke destination');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const errors=[],screenshots=[],checks=[];let report={status:'FAIL',version:expected,sha:process.env.GITHUB_SHA||null};
try{
 const context=await browser.newContext({reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',()=>errors.push('Frontend JavaScript error'));
 const post=async(path,data)=>{const r=await context.request.post(base+path,{data});assert.equal(r.status(),200,`Production ${path} failed (body redacted)`);return r.json();};
 const cmd=(user,command)=>post('/api/command',{...user,command});
 const state=async user=>{const r=await context.request.get(base+`/api/state?code=${user.code}&token=${user.token}`);assert.equal(r.status(),200);return r.json();};
 const open=async user=>{await page.goto(base);await page.evaluate(({code,token})=>{localStorage.setItem('sd-'+code,token);history.replaceState(null,'','?room='+code);},user);await page.reload();await page.locator('[data-own-card]').first().waitFor();await waitForArtwork(page);};
 const shot=async(name,width,height)=>{await page.setViewportSize({width,height});await page.screenshot({path:out+'/'+name+'.png',fullPage:true});screenshots.push(name+'.png');const layout=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));assert.ok(layout.sw<=width+1&&layout.sh<=height+1,'Production viewport overflow');const overlaps=await page.locator('.seat-card').evaluateAll(els=>els.filter(el=>{const a=el.querySelector('.portrait-health'),b=el.querySelector('.armstrip');if(!a||!b||!b.textContent.trim()||getComputedStyle(a).display==='none'||getComputedStyle(b).display==='none')return false;const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();return Math.min(x.right,y.right)-Math.max(x.left,y.left)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>1;}).length);assert.equal(overlaps,0,'Production portrait health/footer overlap');};
 const h=await context.request.get(base+'/api/health');assert.equal(h.status(),200);const health=await h.json();assert.equal(health.version,expected);if(process.env.GITHUB_SHA)assert.equal(health.commit,process.env.GITHUB_SHA);report.health=health;
 const homepage=await page.goto(base);assert.equal(homepage.status(),200);
 await page.locator('[data-role-guide]').first().waitFor();assert.equal(await page.locator('[data-role-guide]').count(),4,'Homepage must show four role cards');
 const roleTypes=await page.locator('[data-role-guide]').evaluateAll(els=>els.map(el=>el.dataset.roleGuide));assert.deepEqual(roleTypes,['honest','crooked','agent','kingpin']);
 await page.locator('[data-role-guide="kingpin"]').click();await page.getByRole('dialog',{name:'TRÙM MAFIA'}).waitFor();await page.locator('#modal [data-act="close"]').click();
 assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),base+'/social-preview.jpg');
 const ogResponse=await context.request.get(base+'/social-preview.jpg');assert.equal(ogResponse.status(),200,'Social preview not available');assert.ok(ogResponse.headers()['content-type'].startsWith('image/jpeg'),'Invalid social preview content type');assert.ok((await ogResponse.body()).length>50000,'Social preview must be valid image bytes');
 const faviconResponse=await context.request.get(base+'/favicon.svg');assert.equal(faviconResponse.status(),200);assert.match(await faviconResponse.text(),/<svg/);
 checks.push('Homepage displays four role cards, details, favicon and Open Graph preview');
 const owner=await post('/api/create',{name:'Release QA · Chủ phòng'}),users=[owner];for(const name of ['QA Bravo','QA Charlie','QA Delta'])users.push(await post('/api/join',{code:owner.code,name}));
 await cmd(owner,{type:'start'});await open(owner);assert.equal(await page.locator('[data-pick-card]').count(),12);
 for(let i=1;i<4;i++)assert.ok((await state(owner)).players[i].cards.every(c=>c.type===null));
 await shot('production-pc-4',1366,768);await shot('production-mobile-4',390,844);
 await page.locator('[data-seat-info="1"]').click();await page.getByRole('dialog').waitFor();assert.equal(await page.locator('#modal .inspect-role').count(),3);assert.equal(await page.locator('#modal .role-portrait').count(),0);await shot('production-character-detail',390,844);await page.locator('#modal [data-act="confirm"]').click();await page.locator('[data-eqcard-index="0"]').click();await page.getByRole('dialog').waitFor();await shot('production-equipment-detail',390,844);await page.locator('#modal [data-act="close"]').first().click();
 await page.locator('[data-pick-card="1:0"]').click();await page.locator('#modal [data-act="confirm"]').click();await page.getByRole('dialog',{name:'Hồ sơ đã xác minh'}).waitFor();const known=(await state(owner)).known;assert.equal(Object.keys(known).length,1);assert.deepEqual((await state(users[2])).known,{});await page.locator('#modal [data-act="close"]').last().click();checks.push('Four-human room and private investigation isolated from another player');
 await cmd(owner,{type:'endTurn'});
 const cycle=async()=>{for(let i=1;i<4;i++){await cmd(users[i],{type:'actionInvestigate',target:0,slot:1});await cmd(users[i],{type:'endTurn'});}};
 await cycle();await cmd(owner,{type:'actionArm'});await cmd(owner,{type:'chooseReveal',slot:0});await cmd(owner,{type:'chooseAim',target:1});await page.locator('[data-aim-from="0"][data-aim-to="1"]').waitFor();await shot('production-aim',1366,768);
 await cmd(owner,{type:'endTurn'});await cycle();await cmd(owner,{type:'actionShoot'});await page.locator('.reaction-table').waitFor();const pending=(await state(owner)).pending;await shot('production-reaction',1366,768);await shot('production-reaction-mobile',390,844);await page.reload();await page.locator('.reaction-table').waitFor();assert.deepEqual((await state(owner)).pending,pending);for(let i=1;i<4;i++)await cmd(users[i],{type:'passShot'});assert.equal((await state(owner)).pending,null);await page.locator('.seat-card.wounded,.seat-card.dead').first().waitFor();await shot('production-impact',1366,768);checks.push('Actual Durable Object arm, reveal, aim, shoot, reactions and pending reconnect');
 const bot=await post('/api/create',{name:'Release QA · BOT'});await cmd(bot,{type:'setBots',count:7,level:'hard'});await cmd(bot,{type:'start'});await open(bot);assert.equal(await page.locator('[data-pick-card]').count(),24);await shot('production-pc-8',1366,768);await shot('production-mobile-8',390,844);
 await cmd(bot,{type:'actionInvestigate',target:1,slot:0});await cmd(bot,{type:'endTurn'});const before=JSON.stringify((await state(bot)).log);let advanced=false;
 for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1500));if(JSON.stringify((await state(bot)).log)!==before){advanced=true;break;}}
 assert.ok(advanced,'Production Durable Object BOT alarm did not advance');checks.push('Eight-player board and real hard BOT alarm advances on Cloudflare');
 assert.deepEqual(errors,[]);report={...report,status:'PASS',checks,screenshots,privacy:'Only fresh QA rooms; no user room inspected; no credentials, tokens, state payload or request URLs saved'};
}catch(e){report.error=e.message;throw e;}finally{writeFileSync(out+'/results.json',JSON.stringify(report,null,2));await browser.close();}
console.log('PASS: production Chromium, private multiplayer, shooting reconnect, eight players and BOT alarm');
