import fs from 'node:fs';
import {assetFiles} from './asset-map.mjs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),check=process.argv.includes('--check');
for(const [source,target,,,base64] of assetFiles){
 const bytes=fs.readFileSync(new URL('public/'+source,root));const expected=base64?bytes.toString('base64'):bytes.toString();const dest=new URL('assets/'+target,root);
 if(check){if(fs.readFileSync(dest,'utf8')!==expected)throw Error(`Asset out of sync: ${fileURLToPath(dest)}`);}else fs.writeFileSync(dest,expected);
}
console.log(check?'Assets synchronized':'Generated Cloudflare assets from public/');
