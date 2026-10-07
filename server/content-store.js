import {defaults} from '../src/cms/schema.js';
export function initialState(){return {revision:0,draft:defaults(),published:defaults(),history:[],media:[],inbox:[],events:{},updatedAt:null};}
export class D1Store{
 constructor(db){this.db=db;}
 async read(){const row=await this.db.prepare('SELECT value FROM portfolio_state WHERE id = 1').first();return row?JSON.parse(row.value):initialState();}
 async write(state,expected){const next={...state,revision:expected+1,updatedAt:new Date().toISOString()};if(new TextEncoder().encode(JSON.stringify(next)).length>1800000)throw Object.assign(Error('Content is too large. The content history has reached its storage budget. Export a backup and reduce old revisions before retrying. Media files belong in the media library.'),{status:413});await this.db.prepare('INSERT OR IGNORE INTO portfolio_state(id,revision,value) VALUES(1,0,?)').bind(JSON.stringify(initialState())).run();const result=await this.db.prepare('UPDATE portfolio_state SET revision=?, value=? WHERE id=1 AND revision=?').bind(next.revision,JSON.stringify(next),expected).run();if(!result.meta.changes)throw Object.assign(Error('Content changed in another session. Reload before saving.'),{status:409});return next;}
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
