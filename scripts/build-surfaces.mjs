import {pruneMigratedStatic} from './prune-migrated-static.mjs';
import {packageCaseStudySkill,packageArticleSkill} from './package-case-study-skill.mjs';
import {spawnSync} from 'node:child_process';
import {rename,readdir,stat} from 'node:fs/promises';
const vite=new URL('../node_modules/vite/bin/vite.js',import.meta.url);
await packageCaseStudySkill();
await packageArticleSkill();
function build(target,args=[]){const result=spawnSync(process.execPath,[vite.pathname,'build',...args],{stdio:'inherit',env:{...process.env,VITE_APP_TARGET:target}});if(result.status!==0)process.exit(result.status||1);}
build('public');
await rename(new URL('../dist/index.html',import.meta.url),new URL('../dist/shell.html',import.meta.url));
build('studio',['--outDir','dist/studio-app','--emptyOutDir']);

// Studio must never duplicate the public media tree in every deployment.
const studioEntries=await readdir(new URL('../dist/studio-app/',import.meta.url));
if(studioEntries.some(name=>['projects','journal','images','presentation','brand'].includes(name)))throw Error('Studio build duplicated public media. Check build.copyPublicDir.');

await pruneMigratedStatic();

async function outputBytes(directory){let total=0;for(const entry of await readdir(directory,{withFileTypes:true})){const path=new URL(entry.name+(entry.isDirectory()?'/':''),directory);total+=entry.isDirectory()?await outputBytes(path):(await stat(path)).size;}return total;}
const bytes=await outputBytes(new URL('../dist/',import.meta.url));
if(bytes>25*1024*1024)throw Error('Deployment exceeds the 25 MiB budget. Put media in ParsPack.');
console.log('Deployment bytes:',bytes);
