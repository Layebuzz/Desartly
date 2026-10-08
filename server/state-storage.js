import {gzipSync,gunzipSync,strToU8,strFromU8} from 'fflate';
import {Buffer} from 'node:buffer';

// Keep active fields as ordinary JSON for atomic media-only SQL operations.
// Historical snapshots contain repeated HTML and compress without losing revisions.
export const stateStorageLimit=1800000;
export function encodeStoredState(state){
 const snapshots={};
 for(const key of ['history','documentHistory'])if(state[key]!==undefined)snapshots[key]=state[key];
 const original=JSON.stringify(state),historyJson=JSON.stringify(snapshots);
 if(historyJson.length<64000)return original;
 const packed={...state,_historyArchive:{encoding:'gzip-base64-v1',data:Buffer.from(gzipSync(strToU8(historyJson),{level:6})).toString('base64')}};
 delete packed.history;delete packed.documentHistory;
 const serialized=JSON.stringify(packed);
 return serialized.length<original.length?serialized:original;
}
export function decodeStoredState(value){
 const state=JSON.parse(value);
 if(!state._historyArchive)return state;
 const archive=state._historyArchive;
 if(archive.encoding!=='gzip-base64-v1'||typeof archive.data!=='string')throw Error('Unsupported content-history storage format.');
 const snapshots=JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(archive.data,'base64')))));
 for(const key of Object.keys(snapshots))if(!['history','documentHistory'].includes(key)||!Array.isArray(snapshots[key]))throw Error('Invalid stored content history.');
 delete state._historyArchive;
 return {...state,...snapshots};
}
