import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {initialState} from './content-store.js';
export class LocalStore{
 constructor(root){this.root=path.join(root,'.pol-data');this.queue=Promise.resolve();}
 async read(){try{return JSON.parse(await readFile(path.join(this.root,'state.json'),'utf8'));}catch(e){if(e.code==='ENOENT')return initialState();throw e;}}
 async write(state,expected){const task=this.queue.catch(()=>{}).then(async()=>{const current=await this.read();if(current.revision!==expected)throw Object.assign(Error('Content changed in another session. Reload before saving.'),{status:409});const next={...state,revision:expected+1,updatedAt:new Date().toISOString()};await mkdir(this.root,{recursive:true});const temp=path.join(this.root,'state.tmp');await writeFile(temp,JSON.stringify(next),{mode:0o600});await rename(temp,path.join(this.root,'state.json'));return next;});this.queue=task;return task;}
 async put(id,bytes){await mkdir(path.join(this.root,'media'),{recursive:true});await writeFile(path.join(this.root,'media',id),bytes);return {local:id};}
 async get(asset){return new Response(await readFile(path.join(this.root,'media',asset.local)));}
}
