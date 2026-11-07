// public/ is canonical. This map drives Cloudflare generation and release integrity.
export const assetFiles=[
 ['index.html','index.txt','html','text/html; charset=utf-8'],
 ['app.js','app.txt','appJS','text/javascript; charset=utf-8'],
 ['style.css','style.txt','styles','text/css; charset=utf-8'],
 ['favicon.svg','favicon.txt','favicon','image/svg+xml'],
 ['board-texture.webp','table-b64.txt','tableB64','image/webp',true],
 ['item-art.webp','item-art-b64.txt','itemArtB64','image/webp',true],
 ['portraits.webp','portraits-b64.txt','portraitsB64','image/webp',true],
 ['roles.webp','roles-b64.txt','rolesB64','image/webp',true],
 ['card-back.webp','card-back-b64.txt','cardBackB64','image/webp',true],
 ['art-manifest.json','art-manifest.txt','artManifest','application/json; charset=utf-8']
];
