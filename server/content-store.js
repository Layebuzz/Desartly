import {defaults} from '../src/cms/schema.js';
import {encodeStoredStateAsync,decodeStoredStateAsync,stateStorageLimit} from './state-storage.js';
export function initialState(){return {revision:0,draft:defaults(),published:defaults(),history:[],media:[],inbox:[],events:{},updatedAt:null};}
export class D1Store{
 constructor(db){this.db=db;}
 async readAccess(){const row=await this.db.prepare("SELECT json_extract(value,'$.agentKeys') AS keys FROM portfolio_state WHERE id=1").first();return {agentKeys:JSON.parse(row?.keys||'[]')};}
 async storageUsage(){const row=await this.db.prepare('SELECT length(CAST(value AS BLOB)) AS bytes FROM portfolio_state WHERE id=1').first();return row?.bytes||0;}
 async read(){const row=await this.db.prepare('SELECT value FROM portfolio_state WHERE id = 1').first();return row?await decodeStoredStateAsync(row.value):initialState();}
 async write(state,expected){const next={...state,revision:expected+1,updatedAt:new Date().toISOString()},stored=next.historyStorageVersion===1?await encodeStoredStateAsync(next):JSON.stringify(next);if(new TextEncoder().encode(stored).length>stateStorageLimit)throw Object.assign(Error(next.historyStorageVersion===1?'Active CMS content exceeds its storage limit after lossless history compression. Keep large assets in the media library.':'CMS content metadata exceeds its storage limit. Image optimization is separate; lossless history storage must be enabled by the site administrator.'),{status:413});await this.db.prepare('INSERT OR IGNORE INTO portfolio_state(id,revision,value) VALUES(1,0,?)').bind(JSON.stringify(initialState())).run();const result=await this.db.prepare('UPDATE portfolio_state SET revision=?, value=? WHERE id=1 AND revision=?').bind(next.revision,stored,expected).run();if(!result.meta.changes)throw Object.assign(Error('Content changed in another session. Reload before saving.'),{status:409});return next;}
 async readMedia(){
  const row=await this.db.prepare("SELECT revision, json_extract(value,'$.media') AS media, json_extract(value,'$.customMediaFolders') AS folders, json_extract(value,'$.mediaFolderLocations') AS locations FROM portfolio_state WHERE id=1").first();
  if(!row)return {revision:0,media:[],customMediaFolders:[],mediaFolderLocations:{}};
  const state={revision:row.revision,media:JSON.parse(row.media||'[]'),customMediaFolders:JSON.parse(row.folders||'[]'),mediaFolderLocations:JSON.parse(row.locations||'{}')};
  const roots=await this.db.prepare("SELECT 'Projects/'||json_extract(p.value,'$.id') AS folder FROM portfolio_state s,json_each(s.value,'$.draft.projects') p UNION SELECT 'Projects/'||json_extract(p.value,'$.id') FROM portfolio_state s,json_each(s.value,'$.published.projects') p UNION SELECT 'Journal/'||json_extract(p.value,'$.id') FROM portfolio_state s,json_each(s.value,'$.draft.blogPosts') p UNION SELECT 'Journal/'||json_extract(p.value,'$.id') FROM portfolio_state s,json_each(s.value,'$.published.blogPosts') p").all();
  state.customMediaFolders=[...new Set([...state.customMediaFolders,...roots.results.map(r=>state.mediaFolderLocations[r.folder]||r.folder)])];return state;
 }
 async writeMedia(state,expected){
  const updatedAt=new Date().toISOString(),media=JSON.stringify(state.media),folders=JSON.stringify(state.customMediaFolders||[]),locations=JSON.stringify(state.mediaFolderLocations||{});
  const result=await this.db.prepare("WITH next AS (SELECT json_set(value,'$.media',json(?),'$.customMediaFolders',json(?),'$.mediaFolderLocations',json(?),'$.revision',?,'$.updatedAt',?) AS value FROM portfolio_state WHERE id=1 AND revision=?) UPDATE portfolio_state SET revision=?,value=(SELECT value FROM next) WHERE id=1 AND revision=? AND length(CAST((SELECT value FROM next) AS BLOB))<=1800000").bind(media,folders,locations,expected+1,updatedAt,expected,expected+1,expected).run();
  if(!result.meta.changes)throw Object.assign(Error('Media changed or the library exceeded its storage budget. Reload before restoring.'),{status:409});return {...state,revision:expected+1,updatedAt};
 }

}
