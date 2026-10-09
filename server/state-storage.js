import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';
import {Buffer} from 'node:buffer';

// Keep active fields as ordinary JSON for atomic media-only SQL operations.
// Historical snapshots contain repeated HTML and compress without losing revisions.
export const stateStorageLimit=1800000;
export function encodeStoredState(state){
 const snapshots={};
 for(const key of ['history','documentHistory'])if(state[key]!==undefined)snapshots[key]=state[key];
 const original=JSON.stringify(state),historyJson=JSON.stringify(snapshots);
 const active=structuredClone(state),strings=[],paths=[],indices=new Map();
 function pack(value,path){if(!value||typeof value!=='object')return;for(const [key,item] of Object.entries(value)){const location=[...path,key];if(typeof item==='string'&&item.length>=2048&&['html','text','markdown','content'].includes(key)){let index=indices.get(item);if(index===undefined){index=strings.length;indices.set(item,index);strings.push(item);}paths.push([location,index]);value[key]='';}else if(item&&typeof item==='object')pack(item,location);}}
 for(const root of ['draft','published'])pack(active[root],[root]);
 if(paths.length)active._contentArchive={encoding:'gzip-base64-v1',data:Buffer.from(gzipSync(strToU8(JSON.stringify({strings,paths})),{level:6})).toString('base64')};
 if(historyJson.length<64000){const serialized=JSON.stringify(active);return serialized.length<original.length?serialized:original;}
 const packed={...active,_historyArchive:{encoding:'gzip-base64-v1',data:Buffer.from(gzipSync(strToU8(historyJson),{level:6})).toString('base64')}};
 delete packed.history;delete packed.documentHistory;
 const serialized=JSON.stringify(packed);
 return serialized.length<original.length?serialized:original;
}
export function decodeStoredState(value){
 const state=JSON.parse(value);
 if(state._contentArchive){
  const archive=state._contentArchive;if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported active-content storage format.');
  const {strings,paths}=JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(archive.data,'base64')))));
  if(!Array.isArray(strings)||!strings.every(s=>typeof s==='string')||!Array.isArray(paths))throw Error('Invalid stored active content.');
  for(const entry of paths){if(!Array.isArray(entry)||entry.length!==2)throw Error('Invalid stored content path.');const [path,index]=entry;if(!Array.isArray(path)||path.length<2||!['draft','published'].includes(path[0])||path.some(k=>typeof k!=='string'||['__proto__','prototype','constructor'].includes(k))||!Number.isInteger(index)||index<0||index>=strings.length)throw Error('Invalid stored content path.');let parent=state;for(const key of path.slice(0,-1)){if(!parent||typeof parent!=='object'||!Object.hasOwn(parent,key))throw Error('Missing stored content path.');parent=parent[key];}const key=path.at(-1);if(!parent||parent[key]!=='')throw Error('Invalid stored content placeholder.');parent[key]=strings[index];}
  delete state._contentArchive;
 }
 if(!state._historyArchive)return state;
 const archive=state._historyArchive;
 if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported content-history storage format.');
 const snapshots=JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(archive.data,'base64')))));
 for(const key of Object.keys(snapshots))if(!['history','documentHistory'].includes(key)||!Array.isArray(snapshots[key]))throw Error('Invalid stored content history.');
 delete state._historyArchive;
 return {...state,...snapshots};
}
