import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const golden=new URL('../docs/v182/golden/',import.meta.url);
export async function waitForArtwork(page){
 return page.evaluate(async()=>{await document.fonts.ready;for(const family of ['Detective Sans','Detective Serif','Detective Symbols','Detective Symbols Two'])for(const weight of ['400','700']){await document.fonts.load(`${weight} 14px "${family}"`);if(![...document.fonts].some(f=>f.family.replaceAll('"','').replaceAll("'",'')===family&&f.status==='loaded'))throw Error('Bundled font not loaded: '+family); }const files=['portraits.webp','roles.webp','item-art.webp','board-texture.webp','card-back.webp'];const results=[];
  for(const file of files){const img=new Image();img.src='/'+file+'?v=1.8.0';await img.decode();const cols=file==='portraits.webp'?4:file==='roles.webp'?2:file==='item-art.webp'?6:1,rows=file==='portraits.webp'||file==='roles.webp'?2:file==='item-art.webp'?4:1,count=file==='item-art.webp'?23:cols*rows;
   const fingerprints=[];for(let i=0;i<count;i++){const c=document.createElement('canvas');const sample=file==='card-back.webp'?128:24;c.width=c.height=sample;const ctx=c.getContext('2d');ctx.drawImage(img,(i%cols)*img.width/cols,Math.floor(i/cols)*img.height/rows,img.width/cols,img.height/rows,0,0,sample,sample);const d=ctx.getImageData(0,0,sample,sample).data;let sum=0,sq=0;for(let k=0;k<d.length;k+=4){const v=(d[k]+d[k+1]+d[k+2])/3;sum+=v;sq+=v*v;}const spread=Math.sqrt(sq/(sample*sample)-(sum/(sample*sample))**2);if(spread<12)throw Error('Artwork tile is blank/flat: '+file+'/'+i);fingerprints.push(c.toDataURL());}
   if(new Set(fingerprints).size!==count)throw Error('Artwork tiles duplicated: '+file);results.push({file,width:img.width,height:img.height,distinctIllustrations:count});
  }return results;
 });
}
export async function compareGolden(page,name,png,out){
 if(!['pc-4','pc-8','mobile-4','mobile-8'].includes(name))return null;
 const dest=new URL(name+'.png',golden);
 if(process.env.UPDATE_V18_GOLDENS==='1'){mkdirSync(golden,{recursive:true});writeFileSync(dest,png);return {name,status:'UPDATED'};}
 const ref=readFileSync(dest),r=await page.evaluate(async({a,b})=>{async function pixels(data){const im=new Image();im.src='data:image/png;base64,'+data;await im.decode();const c=document.createElement('canvas');c.width=128;c.height=96;const x=c.getContext('2d');x.drawImage(im,0,0,128,96);return x.getImageData(0,0,128,96).data;}const x=await pixels(a),y=await pixels(b);let error=0,changed=0;for(let i=0;i<x.length;i+=4){const d=(Math.abs(x[i]-y[i])+Math.abs(x[i+1]-y[i+1])+Math.abs(x[i+2]-y[i+2]))/3;error+=d;if(d>30)changed++;}return {meanChannelError:error/(128*96),changedBlockRatio:changed/(128*96)};},{a:ref.toString('base64'),b:png.toString('base64')});
 const result={name,...r,status:r.meanChannelError<=5&&r.changedBlockRatio<=.06?'PASS':'FAIL',limits:{meanChannelError:5,changedBlockRatio:.06}};writeFileSync(new URL(name+'-visual.json',out),JSON.stringify(result,null,2));assert.equal(result.status,'PASS',`Visual regression ${name}: ${JSON.stringify(result)}`);return result;
}
