import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';
import {Buffer} from 'node:buffer';

// Keep active fields as ordinary JSON for atomic media-only SQL operations.
// Historical snapshots contain repeated HTML and compress without losing revisions.
export const stateStorageLimit=1800000;
function prepareState(state){
 const snapshots={};
 for(const key of ['history','documentHistory'])if(state[key]!==undefined)snapshots[key]=state[key];
 const original=JSON.stringify(state),historyJson=JSON.stringify(snapshots);
 const active=structuredClone(state),strings=[],paths=[],indices=new Map();
 function pack(value,path){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){const location=[...path,key];if(typeof item==='string'&&item.length>=2048&&['html','text','markdown','content'].includes(key)){let index=indices.get(item);if(index===undefined){index=strings.length;indices.set(item,index);strings.push(item);}paths.push([location,index]);value[key]='';}else if(item&&typeof item==='object')pack(item,location);}}
 for(const root of ['draft','published'])pack(active[root],[root]);
 return {active,original,historyJson,contentJson:paths.length?JSON.stringify({strings,paths}):null};
}
const base64=bytes=>Buffer.from(bytes).toString('base64');
function finishState(prepared,content,history){const {active,original}=prepared;if(content)active._contentArchive={encoding:'gzip-base64-v1',data:base64(content)};if(history){active._historyArchive={encoding:'gzip-base64-v1',data:base64(history)};delete active.history;delete active.documentHistory;}const serialized=JSON.stringify(active);return serialized.length<original.length?serialized:original;}
export function encodeStoredState(state){const p=prepareState(state);return finishState(p,p.contentJson?gzipSync(strToU8(p.contentJson),{level:6}):null,p.historyJson.length>=64000?gzipSync(strToU8(p.historyJson),{level:6}):null);}
async function streamBytes(bytes,mode){const stream=new Blob([bytes]).stream().pipeThrough(mode==='gzip'?new CompressionStream('gzip'):new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer());}
export async function encodeStoredStateAsync(state){const p=prepareState(state);const [content,history]=await Promise.all([p.contentJson?streamBytes(strToU8(p.contentJson),'gzip'):null,p.historyJson.length>=64000?streamBytes(strToU8(p.historyJson),'gzip'):null]);return finishState(p,content,history);}
export async function decodeStoredStateAsync(value){const state=JSON.parse(value),expanded={};for(const key of ['_contentArchive','_historyArchive'])if(state[key]){const archive=state[key];if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported stored content format.');expanded[key]=JSON.parse(strFromU8(await streamBytes(new Uint8Array(Buffer.from(archive.data,'base64')),'gunzip')));}return unpackState(state,expanded);}
export function decodeStoredState(value){const state=JSON.parse(value),expanded={};for(const key of ['_contentArchive','_historyArchive'])if(state[key]){const archive=state[key];if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported stored content format.');expanded[key]=JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(archive.data,'base64')))));}return unpackState(state,expanded);}
function unpackState(state,expanded){
 if(state._contentArchive){
  const archive=state._contentArchive;if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported active-content storage format.');
  const {strings,paths}=expanded._contentArchive;
  if(!Array.isArray(strings)||!strings.every(s=>typeof s==='string')||!Array.isArray(paths))throw Error('Invalid stored active content.');
  for(const entry of paths){if(!Array.isArray(entry)||entry.length!==2)throw Error('Invalid stored content path.');const [path,index]=entry;if(!Array.isArray(path)||path.length<2||!['draft','published'].includes(path[0])||path.some(k=>typeof k!=='string'||['__proto__','prototype','constructor'].includes(k))||!Number.isInteger(index)||index<0||index>=strings.length)throw Error('Invalid stored content path.');let parent=state;for(const key of path.slice(0,-1)){if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('Missing stored content path.');parent=parent[key];}const key=path.at(-1);if(!parent||parent[key]!=='')throw Error('Invalid stored content placeholder.');parent[key]=strings[index];}
  delete state._contentArchive;
 }
 if(!state._historyArchive)return state;
 const archive=state._historyArchive;
 if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported content-history storage format.');
 const snapshots=expanded._historyArchive;
 for(const key of Object.keys(snapshots))if(!['history','documentHistory'].includes(key)||!Array.isArray(snapshots[key]))throw Error('Invalid stored content history.');
 delete state._historyArchive;
 return {...state,...snapshots};
}
