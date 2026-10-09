import {isOwner} from './owner-auth.js';
export const retentionDays=14;
export function safeMessage(value){return String(value||'').replace(/https?:\/\/[^\s]+/g,'[url]').replace(/(?:Bearer\s+)[\w.\-]+/gi,'Bearer [redacted]').replace(/\b(?:token|password|secret|cookie|authorization|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,'[credential redacted]').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').slice(0,1000);}
export function safePath(value){try{return new URL(value,'https://local.invalid').pathname.replace(/\/[a-f0-9]{32,}/gi,'/[id]').slice(0,180);}catch{return '/';}}
export async function writeLog(env,entry){
 if(!env.DB)return;
 const level=['info','warning','error'].includes(entry.level)?entry.level:'error';
 await env.DB.prepare('INSERT INTO runtime_logs(id,created_at,level,source,event,path,request_id,status,duration_ms,message) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),new Date().toISOString(),level,String(entry.source||'worker').slice(0,30),String(entry.event||'request').slice(0,60),safePath(entry.path),String(entry.requestId||'').slice(0,80),Number.isInteger(entry.status)?entry.status:null,Number.isFinite(entry.duration)?Math.round(entry.duration):null,safeMessage(entry.message)).run();
}
export function logLater(env,ctx,entry){const work=writeLog(env,entry).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(work);return work;}
export async function pruneLogs(env){if(env.DB){await env.DB.prepare("DELETE FROM runtime_logs WHERE created_at < ? OR id IN (SELECT id FROM runtime_logs ORDER BY created_at DESC LIMIT -1 OFFSET 10000)").bind(new Date(Date.now()-retentionDays*86400000).toISOString()).run();}}
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function logsResponse(request,env,ctx){
 const url=new URL(request.url);
 if(!['/api/studio/logs','/api/runtime-log'].includes(url.pathname))return null;
 const owner=await isOwner(request,env);
 if(url.pathname==='/api/studio/logs'){
  if(!owner)return json({error:'Owner sign-in required.'},401);
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  if(!env.DB)return json({error:'Logging database unavailable.'},503);
  const conditions=[],args=[];
  for(const [param,column] of [['level','level'],['source','source'],['trace','request_id']]){const value=url.searchParams.get(param);if(value){conditions.push(column+'=?');args.push(value.slice(0,80));}}
  const query=url.searchParams.get('q');if(query){conditions.push('(event LIKE ? OR path LIKE ? OR message LIKE ?)');args.push(...Array(3).fill('%'+query.slice(0,120)+'%'));}
  for(const [param,operator] of [['after','>='],['before','<=']]){const date=url.searchParams.get(param);if(date&&/^\d{4}-\d{2}-\d{2}$/.test(date)){conditions.push('created_at '+operator+' ?');args.push(date+(param==='before'?'T23:59:59.999Z':'T00:00:00.000Z'));}}
  const cursor=url.searchParams.get('cursor');if(cursor){const [date,id]=cursor.split('|');conditions.push('(created_at < ? OR (created_at=? AND id<?))');args.push(date,date,id||'');}
  const result=await env.DB.prepare('SELECT * FROM runtime_logs'+(conditions.length?' WHERE '+conditions.join(' AND '):'')+' ORDER BY created_at DESC,id DESC LIMIT 101').bind(...args).all();
  const items=result.results.slice(0,100),last=items.at(-1);
  const stats=await env.DB.prepare("SELECT level,COUNT(*) AS count FROM runtime_logs WHERE created_at>=? GROUP BY level").bind(new Date(Date.now()-86400000).toISOString()).all();
  return json({items,next:result.results.length>100?last.created_at+'|'+last.id:null,stats:stats.results,retentionDays,maxRows:10000});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(request.headers.get('Origin')!==url.origin)return json({error:'Origin rejected.'},403);
 // Public browser reports are bounded and share the existing per-IP abuse limiter.
 if(!owner&&(!env.PUBLIC_RATE_LIMITER||!(await env.PUBLIC_RATE_LIMITER.limit({key:'runtime:'+request.headers.get('CF-Connecting-IP')})).success))return json({ok:true},202);
 const reader=request.body?.getReader();let size=0,parts=[];
 if(reader)for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4000){await reader.cancel();return json({error:'Report too large.'},413);}parts.push(value);}
 try{const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}const body=JSON.parse(new TextDecoder().decode(bytes));
  if(!['browser-error','unhandled-rejection','api-error','upload-error'].includes(body.event))return json({error:'Unsupported event.'},400);
  await logLater(env,ctx,{event:body.event,source:owner?'cms-browser':'site-browser',level:'error',path:body.path,message:body.message,requestId:body.requestId,status:body.status});return json({ok:true},202);
 }catch{return json({error:'Invalid report.'},400);}
}
