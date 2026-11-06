import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function loadWorker(){
  let source=fs.readFileSync(path.join(root,'worker.mjs'),'utf8');
  const engine=fs.readFileSync(path.join(root,'src/engine.mjs'),'utf8');
  const dataURI=`data:text/javascript;base64,${Buffer.from(engine).toString('base64')}`;
  source=source.replace("from './src/engine.mjs'",`from '${dataURI}'`);
  for(const [name,identifier] of [['assets/index.txt','html'],['assets/app.txt','appJS'],['assets/style.txt','styles'],['assets/favicon.txt','favicon'],['assets/table-b64.txt','tableB64'],['assets/item-art-b64.txt','itemArtB64']]){
    source=source.replace(`import ${identifier} from './${name}';`,`const ${identifier} = ${JSON.stringify(fs.readFileSync(path.join(root,name),'utf8'))};`);
  }
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
