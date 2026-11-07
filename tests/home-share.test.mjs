import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
test('homepage includes all four public role guides',()=>{
 const app=read('public/app.js').toString();
 for(const kind of ['honest','crooked','agent','kingpin'])assert.ok(app.includes("type:'"+kind+"'"));
 assert.match(app,/function roleGuideSection\(/);assert.match(app,/data-role-guide=/);assert.match(app,/ROLE_GUIDE\.find/);
});
test('Open Graph metadata and icons reference a real 1200x630 JPEG',()=>{
 const index=read('public/index.html').toString(),worker=read('worker.mjs').toString();
 for(const tag of ['og:title','og:description','og:url','og:image','og:image:width','og:image:height','twitter:card','twitter:image'])assert.ok(index.includes(tag),'Missing '+tag);
 assert.match(index,/social-preview\.jpg/);assert.match(index,/favicon\.svg/);assert.match(worker,/path==='\/social-preview\.jpg'/);
 const jpg=read('public/social-preview.jpg');assert.ok(jpg.length>50000);assert.equal(jpg.readUInt16BE(0),0xffd8);assert.equal(jpg.readUInt16BE(jpg.length-2),0xffd9);
});
