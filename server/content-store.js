import {defaults} from '../src/cms/schema.js';
export function initialState(){return {revision:0,draft:defaults(),published:defaults(),history:[],media:[],inbox:[],events:{},updatedAt:null};}
export class D1Store{
 constructor(db){this.db=db;}
 async read(){const row=await this.db.prepare('SELECT value FROM portfolio_state WHERE id = 1').first();return row?JSON.parse(row.value):initialState();}
 async write(state,expected){const next={...state,revision:expected+1,updatedAt:new Date().toISOString()};await this.db.prepare('INSERT OR IGNORE INTO portfolio_state(id,revision,value) VALUES(1,0,?)').bind(JSON.stringify(initialState())).run();const result=await this.db.prepare('UPDATE portfolio_state SET revision=?, value=? WHERE id=1 AND revision=?').bind(next.revision,JSON.stringify(next),expected).run();if(!result.meta.changes)throw Object.assign(Error('Content changed in another session. Reload before saving.'),{status:409});return next;}
}
