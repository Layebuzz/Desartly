import {spawnSync} from 'node:child_process';
import {rename} from 'node:fs/promises';
const vite=new URL('../node_modules/vite/bin/vite.js',import.meta.url);
function build(target,args=[]){const result=spawnSync(process.execPath,[vite.pathname,'build',...args],{stdio:'inherit',env:{...process.env,VITE_APP_TARGET:target}});if(result.status!==0)process.exit(result.status||1);}
build('public');
await rename(new URL('../dist/index.html',import.meta.url),new URL('../dist/shell.html',import.meta.url));
build('studio',['--outDir','dist/studio-app','--emptyOutDir']);
