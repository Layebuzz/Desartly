import {libraryFolders,validateFolder,organiseMedia} from '../src/cms/media-architecture.js';
import {references} from '../src/cms/schema.js';
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
function applyMediaAction(state,body){
 if(body.revision!==state.revision)fail('The library changed. Refresh before trying again.',409);
 if(body.action==='organise')return organiseMedia(state);
 const next=structuredClone(state);next.mediaFolders=libraryFolders(next);
 const folder=String(body.folder||'Site assets').trim().replace(/^\/+|\/+$/g,'');
 if(!folder||folder.length>160||/[\\\x00-\x1f\x7f]/.test(folder)||folder.split('/').some(p=>!p||p==='.'||p==='..'))fail('Use a valid folder path up to 160 characters.');
 if(body.action==='folder'){if(!next.mediaFolders.includes(folder)){next.customMediaFolders=[...new Set([...(next.customMediaFolders||[]),folder])];next.mediaFolders=libraryFolders(next);}return next;}
 if(body.action==='folder-color'){const paths=body.folders||[folder];if(!Array.isArray(paths)||!paths.length||paths.length>100||paths.some(p=>!next.mediaFolders.includes(p)))fail('Choose existing folders.');if(body.color!==null&&!/^#[0-9a-f]{6}$/i.test(body.color||''))fail('Choose a valid folder color.');next.mediaFolderColors={...next.mediaFolderColors};for(const path of paths)if(body.color===null)delete next.mediaFolderColors[path];else next.mediaFolderColors[path]=body.color;return next;}
 if(body.action==='folder-meta'){if(!next.mediaFolders.includes(folder))fail('Folder not found.',404);const metadata=body.metadata||{};if(typeof metadata.note!=='string'||metadata.note.length>1000||!['folder','star','heart','briefcase','image','archive'].includes(metadata.icon||'folder'))fail('Use valid folder details.');if(metadata.cover&&!next.media.some(m=>m.id===metadata.cover&&!m.trashedAt&&m.type.startsWith('image/')))fail('Choose an existing cover image.');next.mediaFolderMetadata={...next.mediaFolderMetadata,[folder]:{note:metadata.note,icon:metadata.icon||'folder',cover:metadata.cover||'',inheritColor:metadata.inheritColor===true,pinned:metadata.pinned===true}};return next;}

 if(body.action==='trash-folder'){
  const source=String(body.source||folder),inside=path=>path===source||path?.startsWith(source+'/');
  if(['Projects','Journal','Certificates','Site assets'].includes(source))fail('System root folders cannot be moved to Trash.',409);if(!next.mediaFolders.includes(source))fail('Folder not found.',404);
  const items=next.media.filter(m=>!m.trashedAt&&inside(m.folder));for(const item of items)if(references(next.draft,item.id)||references(next.published,item.id)||references(next.history,item.id)||references(next.documentHistory,item.id))fail('This folder contains files used by content or history.',409);
  const date=new Date().toISOString();next.trashedMediaFolders=[...(next.trashedMediaFolders||[]),{path:source,paths:(next.customMediaFolders||[]).filter(inside),ids:items.map(m=>m.id),date}];for(const item of items)item.trashedAt=date;
  next.customMediaFolders=(next.customMediaFolders||[]).filter(path=>!inside(path));next.mediaFolders=libraryFolders(next);return next;
 }
 if(body.action==='restore-folder'){
  const record=(next.trashedMediaFolders||[]).find(r=>r.path===body.source);if(!record)fail('Trashed folder not found.',404);if(next.mediaFolders.includes(record.path))fail('A folder already exists at this path. Rename it before restoring.',409);
  next.customMediaFolders=[...new Set([...(next.customMediaFolders||[]),...record.paths,record.path])];for(const item of next.media)if(record.ids.includes(item.id)&&item.trashedAt===record.date)delete item.trashedAt;next.trashedMediaFolders=next.trashedMediaFolders.filter(r=>r!==record);next.mediaFolders=libraryFolders(next);return next;
 }
 if(['move-folder','copy-folder'].includes(body.action)){
  const source=String(body.source||'');
  if(!next.mediaFolders.includes(source)||['Projects','Journal','Certificates','Site assets'].includes(source))fail('Choose a movable folder.');
  if(folder===source||folder.startsWith(source+'/'))fail('A folder cannot be placed inside itself.');
  if(next.mediaFolders.includes(folder))fail('A folder already exists at this destination.',409);
  const inside=path=>path===source||path?.startsWith(source+'/');
  const relocate=path=>folder+path.slice(source.length);
  const paths=next.mediaFolders.filter(inside);
  const metadata={...next.mediaFolderMetadata};for(const [path,value] of Object.entries(metadata))if(inside(path)){metadata[relocate(path)]=value;if(body.action==='move-folder')delete metadata[path];}next.mediaFolderMetadata=metadata;
  const colors={...next.mediaFolderColors};for(const [path,color] of Object.entries(colors))if(inside(path)){colors[relocate(path)]=color;if(body.action==='move-folder')delete colors[path];}next.mediaFolderColors=colors;
  if(body.action==='move-folder'){
   next.customMediaFolders=(next.customMediaFolders||[]).map(path=>inside(path)?relocate(path):path);
   const locations={...(next.mediaFolderLocations||{})};
   for(const site of [next.draft,next.published].filter(Boolean))for(const [field,prefix] of [['projects','Projects/'],['blogPosts','Journal/']])for(const doc of site[field]||[]){const original=prefix+doc.id;const current=locations[original]||original;if(inside(current))locations[original]=relocate(current);}
   next.mediaFolderLocations=locations;
   for(const item of next.media)if(inside(item.folder))item.folder=relocate(item.folder);
  }else{
   for(const item of [...next.media])if(!item.trashedAt&&inside(item.folder)){const id=crypto.randomUUID();next.media.push({...structuredClone(item),id,url:'/api/media/'+id,folder:relocate(item.folder),createdAt:new Date().toISOString()});}
  }
  next.customMediaFolders=[...new Set([...(next.customMediaFolders||[]),...paths.map(relocate),folder])];next.mediaFolders=libraryFolders(next);return next;
 }
 if(['move','copy'].includes(body.action))validateFolder(next,folder);
 if(!['rename','bulk-rename','file-version','file-meta','move','copy','trash','restore','delete'].includes(body.action))fail('Choose a supported file action.');
 if(!Array.isArray(body.ids)||!body.ids.length||body.ids.length>100)fail('Select between 1 and 100 files.');
 const ids=[...new Set(body.ids)],items=ids.map(id=>next.media.find(m=>m.id===id));if(items.some(m=>!m))fail('One of these files no longer exists.',404);
 if(['trash','delete'].includes(body.action))for(const item of items)if(references(next.draft,item.id)||references(next.published,item.id)||references(next.history,item.id)||references(next.documentHistory,item.id))fail('A selected file is used by content or its history. Replace its references before deleting it.',409);
 for(const [index,item] of items.entries()){
  item.updatedAt=new Date().toISOString();
  if(body.action==='file-version'){if(items.length!==1||!Number.isInteger(body.index)||!item.fileVersions?.[body.index])fail('Choose an available file version.');const version=item.fileVersions[body.index],current={variants:item.variants,name:item.name,type:item.type,date:item.updatedAt};item.variants=version.variants;item.name=version.name;item.type=version.type;item.fileVersions=[current,...item.fileVersions.filter((_,i)=>i!==body.index)].slice(0,5);}
  if(body.action==='file-meta'){const meta=body.metadata||{};if((meta.tags!==undefined&&(!Array.isArray(meta.tags)||meta.tags.length>20||meta.tags.some(t=>typeof t!=='string'||t.length>50)))||(meta.note!==undefined&&(typeof meta.note!=='string'||meta.note.length>2000)))fail('Use valid file notes and tags.');for(const key of ['tags','note','favorite','hidden'])if(meta[key]!==undefined){if(['favorite','hidden'].includes(key)&&typeof meta[key]!=='boolean')fail('Use valid file preferences.');item[key]=meta[key];}}
  if(body.action==='bulk-rename'){const pattern=String(body.pattern||'').trim(),start=Number(body.start??1),digits=Number(body.digits??2);if(!Number.isInteger(digits)||digits<1||digits>6)fail('Use one to six number digits.');if(!pattern||pattern.length>140||!Number.isSafeInteger(start)||start<0||start>99999)fail('Use a valid rename pattern and starting number.');const extension=item.name.includes('.')?'.'+item.name.split('.').at(-1):'',base=item.name.replace(/\.[^.]+$/,'');const name=pattern.replaceAll('{name}',base).replaceAll('{n}',String(start+index).padStart(digits,'0'))+extension;if(name.length>180||/[\\/\x00-\x1f]/.test(name))fail('The resulting filename is invalid.');item.name=name;}
  if(body.action==='rename'){if(items.length!==1)fail('Rename one file at a time.');const name=String(body.name||'').trim();if(!name||name.length>180)fail('Use a filename between 1 and 180 characters.');if(/[\\/\x00-\x1f]/.test(name))fail('Use a filename without paths or control characters.');if(name.split('.').at(-1)!==item.name.split('.').at(-1)&&body.confirmExtension!==true)fail('Confirm the filename extension change.');item.name=name;}
  if(body.action==='move'){item.folder=folder;if(!next.mediaFolders.includes(folder))next.mediaFolders.push(folder);}
  if(body.action==='copy'){const id=crypto.randomUUID();next.media.push({...structuredClone(item),id,url:'/api/media/'+id,name:'Copy of '+item.name.slice(0,172),folder,trashedAt:null,createdAt:new Date().toISOString()});if(!next.mediaFolders.includes(folder))next.mediaFolders.push(folder);}
  if(body.action==='trash')item.trashedAt=new Date().toISOString();
  if(body.action==='restore')delete item.trashedAt;
  if(body.action==='delete'){if(!item.trashedAt)fail('Move the file to Trash first.');next.media=next.media.filter(m=>m.id!==item.id);}
 }
 return next;
}

const folderFields=['customMediaFolders','mediaFolderLocations','mediaFolderColors','mediaFolderMetadata','trashedMediaFolders'];
export function mediaAction(state,body){
 if(body.revision!==state.revision)fail('The library changed. Refresh before trying again.',409);
 if(body.action==='undo'){
  const entry=state.mediaUndo?.at(-1);if(!entry)fail('No reversible operation is available.');const next=structuredClone(state);
  for(const change of entry.files){const current=next.media.find(m=>m.id===change.id)||null;if(JSON.stringify(current)!==JSON.stringify(change.after))fail('A file changed after this operation. Undo cannot overwrite newer changes.',409);if(!change.before&&current&&(references(next.draft,current.id)||references(next.published,current.id)||references(next.history,current.id)||references(next.documentHistory,current.id)))fail('This file is now used by content. Undo is protected.',409);next.media=next.media.filter(m=>m.id!==change.id);if(change.before)next.media.push(change.before);}
  for(const [key,change] of Object.entries(entry.folders)){if(JSON.stringify(next[key]??null)!==JSON.stringify(change.after))fail('Folders changed after this operation. Undo cannot overwrite newer changes.',409);if(change.before===null)delete next[key];else next[key]=change.before;}
  next.mediaUndo=next.mediaUndo.slice(0,-1);next.mediaFolders=libraryFolders(next);next.mediaActivity=[{id:crypto.randomUUID(),action:'undo',date:new Date().toISOString(),count:entry.files.length,actor:'Owner'},...(next.mediaActivity||[])].slice(0,100);return next;
 }
 const next=applyMediaAction(state,body),before=new Map((state.media||[]).map(m=>[m.id,m])),after=new Map((next.media||[]).map(m=>[m.id,m])),files=[];
 for(const id of new Set([...before.keys(),...after.keys()]))if(JSON.stringify(before.get(id)||null)!==JSON.stringify(after.get(id)||null))files.push({id,before:before.get(id)||null,after:after.get(id)||null});const folders={};for(const key of folderFields)if(JSON.stringify(state[key]??null)!==JSON.stringify(next[key]??null))folders[key]={before:state[key]??null,after:next[key]??null};
 if(body.action!=='delete'&&(files.length||Object.keys(folders).length)){const history=[...(state.mediaUndo||[]),{id:crypto.randomUUID(),action:body.action,date:new Date().toISOString(),files:structuredClone(files),folders:structuredClone(folders)}].slice(-10);while(history.length&&JSON.stringify(history).length>120000)history.shift();next.mediaUndo=history;}
 next.mediaActivity=[{id:crypto.randomUUID(),action:body.action,date:new Date().toISOString(),count:files.length,folder:body.source||body.folder||'',actor:'Owner'},...(state.mediaActivity||[])].slice(0,100);return next;
}
