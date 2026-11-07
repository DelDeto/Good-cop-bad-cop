import fs from 'node:fs';
import {assetFiles} from '../../scripts/asset-map.mjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export async function loadWorker(){
  let source=fs.readFileSync(path.join(root,'worker.mjs'),'utf8');
  const engine=fs.readFileSync(path.join(root,'src/engine.mjs'),'utf8');
  const dataURI=`data:text/javascript;base64,${Buffer.from(engine).toString('base64')}`;
  source=source.replace("from './src/engine.mjs'",`from '${dataURI}'`);
  for(const [,target,identifier] of assetFiles){const name='assets/'+target;
    source=source.replace(`import ${identifier} from './${name}';`,`const ${identifier} = ${JSON.stringify(fs.readFileSync(path.join(root,name),'utf8'))};`);
  }
  return import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
}
