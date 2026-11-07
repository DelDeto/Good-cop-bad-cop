// Optional UI fixture runner. Uses the real engine and public files; no production hooks.
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {createRoom,joinRoom,startGame,command,view,resolveTimedBribe} from '../src/engine.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=new URL(process.env.BROWSER_OUTPUT_DIR||'../docs/screenshots/',import.meta.url);mkdirSync(output,{recursive:true});
let game;
function fixture(){game=createRoom('ABC123','An','t0');for(let i=1;i<4;i++)joinRoom(game,['','Bình','Chi','Dũng'][i],'t'+i);startGame(game,'t0');for(const p of game.players)p.hand=[];return game;}
const app=createServer((req,res)=>{const path=new URL(req.url,'http://fixture').pathname;const file=path==='/'?'index.html':path.slice(1);try{const body=readFileSync(new URL('../public/'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>app.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${app.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1080}});const errors=[],sent=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{const url=new URL(route.request().url());resolveTimedBribe(game);if(url.pathname==='/api/events')return route.fulfill({status:200,contentType:'text/event-stream',body:`data: ${JSON.stringify(view(game,'t0'))}\n\n`});if(url.pathname==='/api/state')return route.fulfill({json:view(game,'t0')});const d=route.request().postDataJSON();sent.push(d.command);try{command(game,d.token,d.command);await route.fulfill({json:{ok:true,state:view(game,d.token)}});}catch(e){await route.fulfill({status:400,json:{error:e.message}});}});
 async function show(){await page.goto(base);await page.evaluate(()=>{localStorage.setItem('sd-ABC123','t0');history.replaceState(null,'','?room=ABC123');});await page.reload();await page.locator('[data-eqcard-index], [data-own-card]').first().waitFor();}
 fixture();game.players[0].hand=['wire'];await show();
 await page.locator('[data-eqcard-index="0"]').click();await page.locator('[data-act="cancelPick"]').click();assert.equal(sent.length,0);assert.deepEqual(game.players[0].hand,['wire']);
 await page.locator('[data-eqcard-index="0"]').click();await page.locator('[data-select-person="1"]').first().click();await page.waitForFunction(()=>!document.querySelector('[data-eqcard-index]'));
 game.turn=1;game.phase='action';command(game,'t1',{type:'actionInvestigate',target:2,slot:2});await page.reload();await page.getByText('RIÊNG BẠN:',{exact:false}).first().waitFor();
 await page.screenshot({path:new URL('wire-private.png',output).pathname,fullPage:true});assert.ok(view(game,'t0').known[`${game.players[2].id}:2`]);
 fixture();game.players[0].hand=['bribe'];game.players[1].cards[2].type='honest';await show();
 await page.locator('[data-eqcard-index="0"]').click();await page.locator('[data-pick-card="1:2"]').click();await page.locator('[data-act="declineBribe"]').waitFor();assert.equal(game.pending.kind,'bribe');
 await page.screenshot({path:new URL('bribe-decision.png',output).pathname,fullPage:true});
 await page.reload();await page.locator('[data-act="declineBribe"]').waitFor();await page.locator('[data-own-card="0"]').click();await page.locator('#modal [data-act="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('[data-act=declineBribe]'));assert.equal(game.players[0].cards[0].type,'honest');
 fixture();game.players[0].hand=['bribe'];game.players[1].cards[2].type='kingpin';await show();await page.locator('[data-eqcard-index="0"]').click();await page.locator('[data-pick-card="1:2"]').click();await page.getByText('Lá thủ lĩnh:',{exact:false}).waitFor();await page.locator('[data-act="declineBribe"]').click();await page.waitForFunction(()=>!document.querySelector('[data-act=declineBribe], .reaction-table'));assert.equal(game.players[0].hand.length,0);
 fixture();game.players[0].hand=['bribe'];await show();await page.locator('[data-eqcard-index="0"]').click();await page.locator('[data-pick-card="1:2"]').click();await page.locator('[data-act="declineBribe"]').waitFor();
 await page.locator('[data-countdown]').waitFor();const abandoned=structuredClone(game.players.map(p=>p.cards));
 game.pending.deadline=Date.now()-1;await page.reload();await page.getByText('hết thời gian Tiền Bẩn',{exact:false}).waitFor();assert.equal(game.pending,null);assert.deepEqual(game.players.map(p=>p.cards),abandoned);await page.screenshot({path:new URL('bribe-timeout.png',output).pathname,fullPage:true});
 fixture();game.players[1].gun=true;game.players[1].aim=0;game.turn=1;game.players[0].hand=['vest'];command(game,'t1',{type:'actionShoot'});await show();
 await page.locator('.reaction-table').waitFor();await page.locator('.reaction-ready').waitFor();await page.screenshot({path:new URL('reaction-desktop.png',output).pathname,fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.reload();await page.locator('.reaction-table').waitFor();await page.screenshot({path:new URL('reaction-mobile.png',output).pathname,fullPage:true});
 await page.locator('[data-eqcard-index="0"]').click();await page.locator('#modal [data-act="confirm"]').click();await page.waitForFunction(()=>!document.querySelector('[data-act=declineBribe], .reaction-table'));assert.ok(game.players[0].alive);
 assert.deepEqual(errors,[]);writeFileSync(new URL('browser-results.json',output),JSON.stringify({status:'PASS',mode:'engine-backed browser fixtures; HTTP APIs intercepted, not Cloudflare deployment',checks:['equipment cancel sends no command','Wire exact private result','Bribe investigate then swap','Bribe pending survives reload','Bribe leader decline consumes','Bribe timeout reload declines without swap or refund','reaction reload and vest defence','desktop and mobile rendering'],pageErrors:errors},null,2)+'\n');
 console.log('PASS: browser fixture flows and five screenshots');
}finally{await browser?.close();await new Promise(r=>app.close(r));}
