// public/ is canonical. This map drives Cloudflare generation and release integrity.
export const assetFiles=[
 ['index.html','index.txt','html','text/html; charset=utf-8'],
 ['app.js','app.txt','appJS','text/javascript; charset=utf-8'],
 ['style.css','style.txt','styles','text/css; charset=utf-8'],
 ['favicon.svg','favicon.txt','favicon','image/svg+xml'],
 ['social-preview.jpg','social-preview-b64.txt','socialPreviewB64','image/jpeg',true],
 ['board-texture.webp','table-b64.txt','tableB64','image/webp',true],
 ['item-art.webp','item-art-b64.txt','itemArtB64','image/webp',true],
 ['portraits.webp','portraits-b64.txt','portraitsB64','image/webp',true],
 ['roles.webp','roles-b64.txt','rolesB64','image/webp',true],
 ['card-back.webp','card-back-b64.txt','cardBackB64','image/webp',true],
 ['detective-sans-regular.woff2','font-sans-regular-b64.txt','sansRegularB64','font/woff2',true],
 ['detective-sans-bold.woff2','font-sans-bold-b64.txt','sansBoldB64','font/woff2',true],
 ['detective-serif-regular.woff2','font-serif-regular-b64.txt','serifRegularB64','font/woff2',true],
 ['detective-serif-bold.woff2','font-serif-bold-b64.txt','serifBoldB64','font/woff2',true],
 ['detective-symbols.woff2','symbols-b64.txt','symbolsB64','font/woff2',true],
 ['detective-symbols-two.woff2','symbols-two-b64.txt','symbolsTwoB64','font/woff2',true],
 ['art-manifest.json','art-manifest.txt','artManifest','application/json; charset=utf-8']
];
