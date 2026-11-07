import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assetFiles} from './asset-map.mjs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root)),hash=b=>createHash('sha256').update(b).digest('hex');
export function webpSize(b){
 if(b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw Error('Not a WebP');
 for(let i=12;i+8<=b.length;){const tag=b.toString('ascii',i,i+4),n=b.readUInt32LE(i+4),p=i+8;
  if(tag==='VP8 ')return [b.readUInt16LE(p+6)&0x3fff,b.readUInt16LE(p+8)&0x3fff];
  if(tag==='VP8X')return [b.readUIntLE(p+4,3)+1,b.readUIntLE(p+7,3)+1];
  if(tag==='VP8L'){const v=b.readUInt32LE(p+1);return [(v&0x3fff)+1,((v>>>14)&0x3fff)+1];}
  i=p+n+(n%2);
 }throw Error('No WebP dimensions');
}
export function checkArt(){
 const m=JSON.parse(read('public/art-manifest.json'));
 const expected={'portraits.webp':8,'roles.webp':4,'item-art.webp':23,'board-texture.webp':1,'card-back.webp':1};
 if(m.images.length!==5)throw Error('All five final art assets are mandatory');
 for(const im of m.images){const b=read('public/'+im.file),[w,h]=webpSize(b);
  if(w!==im.width||h!==im.height||hash(b)!==im.sha256||b.length!==im.bytes)throw Error('Artwork hash/dimension mismatch: '+im.file);
  if(b.length<50000||w<(im.file==='card-back.webp'?800:1200)||h<800||im.items.length!==expected[im.file]||new Set(im.items).size!==im.items.length||im.grid[0]*im.grid[1]<im.items.length)throw Error('Incomplete/final artwork quality gate: '+im.file);
 }
 if(m.fonts?.length!==6)throw Error('Missing local Latin/Vietnamese fonts');
 for(const f of m.fonts){const b=read('public/'+f.file);if(b.toString('ascii',0,4)!=='wOF2'||hash(b)!==f.sha256||b.length!==f.bytes)throw Error('Font integrity: '+f.file);}
 const coverage=new Set(m.fonts.flatMap(f=>f.uiCodepoints||[]));for(const glyph of ['ⓘ','⌖','→','◆','◎','♟','⚗','♛','✦'])if(!coverage.has('0x'+glyph.codePointAt(0).toString(16)))throw Error('Missing bundled HUD glyph '+glyph);
 const app=read('public/app.js').toString(),ids=Object.keys(JSON.parse('{'+app.match(/const physicalArt=\{([^}]+)\}/)[1].replace(/(\w+):/g,'"$1":')+'}'));
 if(JSON.stringify(ids)!==JSON.stringify(m.images.find(i=>i.file==='item-art.webp').items))throw Error('Equipment artwork order differs from game UI');
 const total=assetFiles.reduce((n,[file])=>n+read('public/'+file).length,0);
 if(total>2400000)throw Error('UI asset budget exceeded');
 console.log(`PASS: 8 original portraits, 4 role illustrations, 23 equipment illustrations, table and illustrated card back; ${total} bytes public assets`);
 return m;
}
if(process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url)checkArt();
