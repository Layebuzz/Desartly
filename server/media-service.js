import {libraryFolders,validateFolder,organiseMedia} from '../src/cms/media-architecture.js';
import {references} from '../src/cms/schema.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export function mediaAction(state,body){
 if(body.revision!==state.revision)fail('The library changed. Refresh before trying again.',409);
 if(body.action==='organise')return organiseMedia(state);
 const next=structuredClone(state);next.mediaFolders=libraryFolders(next);
 const folder=String(body.folder||'Site assets').trim().replace(/^\/+|\/+$/g,'');
 if(!folder||folder.length>160||/[\\\x00-\x1f\x7f]/.test(folder)||folder.split('/').some(p=>!p||p==='.'||p==='..'))fail('Use a valid folder path up to 160 characters.');
 if(body.action==='folder'){if(!next.mediaFolders.includes(folder)){next.customMediaFolders=[...new Set([...(next.customMediaFolders||[]),folder])];next.mediaFolders=libraryFolders(next);}return next;}
 if(['move','copy'].includes(body.action))validateFolder(next,folder);
 if(!['rename','move','copy','trash','restore','delete'].includes(body.action))fail('Choose a supported file action.');
 if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>100)fail('Select between 1 and 100 files.');
 const ids=[...new Set(body.ids)],items=ids.map(id=>next.media.find(m=>m.id===id));if(items.some(m=>!m))fail('One of these files no longer exists.',404);
 if(['trash','delete'].includes(body.action))for(const item of items)if(references(next.draft,item.id)||references(next.published,item.id)||references(next.history,item.id)||references(next.documentHistory,item.id))fail('A selected file is used by content or its history. Replace its references before deleting it.',409);
 for(const item of items){
  if(body.action==='rename'){if(items.length!==1)fail('Rename one file at a time.');const name=String(body.name||'').trim();if(!name||name.length>180)fail('Use a filename between 1 and 180 characters.');item.name=name;}
  if(body.action==='move'){item.folder=folder;if(!next.mediaFolders.includes(folder))next.mediaFolders.push(folder);}
  if(body.action==='copy'){const id=crypto.randomUUID();next.media.push({...structuredClone(item),id,url:'/api/media/'+id,name:'Copy of '+item.name.slice(0,172),folder,trashedAt:null,createdAt:new Date().toISOString()});if(!next.mediaFolders.includes(folder))next.mediaFolders.push(folder);}
  if(body.action==='trash')item.trashedAt=new Date().toISOString();
  if(body.action==='restore')delete item.trashedAt;
  if(body.action==='delete'){if(!item.trashedAt)fail('Move the file to Trash first.');next.media=next.media.filter(m=>m.id!==item.id);}
 }
 return next;
}
