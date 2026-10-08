import {spawnSync} from 'node:child_process';
import {rename,readdir} from 'node:fs/promises';
const vite=new URL('../node_modules/vite/bin/vite.js',import.meta.url);
function build(target,args=[]){const result=spawnSync(process.execPath,[vite.pathname,'build',...args],{stdio:'inherit',env:{...process.env,VITE_APP_TARGET:target}});if(result.status!==0)process.exit(result.status||1);}
build('public');
await rename(new URL('../dist/index.html',import.meta.url),new URL('../dist/shell.html',import.meta.url));
build('studio',['--outDir','dist/studio-app','--emptyOutDir']);

// Studio must never duplicate the public media tree in every deployment.
const studioEntries=await readdir(new URL('../dist/studio-app/',import.meta.url));
if(studioEntries.some(name=>['projects','journal','images','presentation','brand'].includes(name)))throw Error('Studio build duplicated public media. Check build.copyPublicDir.');
