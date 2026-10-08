import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const roots=['projects','journal','images','presentation','brand'];
const types={webp:'image/webp',avif:'image/avif',png:'image/png',svg:'image/svg+xml',pdf:'application/pdf',zip:'application/zip',txt:'text/plain; charset=utf-8',woff2:'font/woff2',ttf:'font/ttf'};
const assets={};
async function walk(path){for(const entry of await readdir(new URL('../public/'+path,import.meta.url),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())await walk(child);else {const bytes=await readFile(new URL('../public/'+child,import.meta.url));const sha256=createHash('sha256').update(bytes).digest('hex');const type=types[child.split('.').at(-1)];if(!type)throw Error('Unsupported static type: '+child);assets['/'+child]={sha256,size:bytes.length,type,key:'static/'+sha256+'/'+entry.name};}}}
for(const root of roots)await walk(root);
await writeFile(new URL('../server/static-assets.json',import.meta.url),JSON.stringify(assets,null,2)+'\n');
console.log({files:Object.keys(assets).length,bytes:Object.values(assets).reduce((n,a)=>n+a.size,0)});

const configUrl=new URL('../vercel.json',import.meta.url);
const config=JSON.parse(await readFile(configUrl,'utf8'));
config.rewrites=[...Object.keys(assets).map(path=>({source:path,destination:'https://desartly.layebuzz.workers.dev/api/static?asset='+path})),...config.rewrites.filter(rule=>!rule.destination.startsWith('https://desartly.layebuzz.workers.dev/api/static?'))];
await writeFile(configUrl,JSON.stringify(config,null,2)+'\n');
