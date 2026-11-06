import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),check=process.argv.includes('--check');
for(const [source,target,base64] of [['index.html','index.txt'],['app.js','app.txt'],['style.css','style.txt'],['favicon.svg','favicon.txt'],['board-texture.webp','table-b64.txt',true],['item-art.webp','item-art-b64.txt',true]]){
 const bytes=fs.readFileSync(new URL('public/'+source,root));const expected=base64?bytes.toString('base64'):bytes.toString();const dest=new URL('assets/'+target,root);
 if(check){if(fs.readFileSync(dest,'utf8')!==expected)throw Error(`Asset out of sync: ${fileURLToPath(dest)}`);}else fs.writeFileSync(dest,expected);
}
console.log(check?'Assets synchronized':'Generated Cloudflare assets from public/');
