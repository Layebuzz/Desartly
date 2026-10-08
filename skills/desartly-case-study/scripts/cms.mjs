#!/usr/bin/env node
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const readTools=new Set(['cms_schema','cms_editorial_standard','cms_presentation_guide','cms_project_template','cms_benchmarks','cms_grid_presets','cms_media_architecture','cms_media_list','cms_list','cms_get','cms_review']);
const writeTools=new Set(['cms_create','cms_save','cms_upload']);
export function createClient({endpoint='https://studio.desartly.info/mcp',token,cookie,fetchImpl=fetch}={}){
 const url=new URL(endpoint);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)throw Error('Use a credential-free HTTPS MCP endpoint.');
 if(!token&&!cookie)throw Error('No helper credentials configured. Check connected CMS tools and the existing Studio session before requesting access.');
 if(!token&&(url.origin!=='https://studio.desartly.info'||!/^pol_owner=[^;\s]+$/.test(cookie)))throw Error('Use only a scoped pol_owner cookie on the exact Studio origin.');
 const secrets=[token,cookie,!token&&cookie?.slice('pol_owner='.length)].filter(Boolean);
 const safe=message=>secrets.reduce((value,secret)=>value.split(secret).join('[redacted]'),String(message)).replace(/[A-Za-z0-9+/=]{100,}/g,'[long data omitted]').slice(0,240);
 return async function call(name,args={},permission='read'){
  if(!readTools.has(name)&&!(writeTools.has(name)&&permission==='write')&&!(name==='cms_publish'&&permission==='publish'))throw Error('Tool is not permitted in this mode. Use --write or --publish only within the owner’s request.');
  const response=await fetchImpl(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{...(token?{Authorization:'Bearer '+token}:{Cookie:cookie}),'Content-Type':'application/json',Accept:'application/json','Origin':url.origin},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
  if(!response.ok)throw Error('CMS HTTP '+response.status+'. Reread state before retrying a write.');
  const envelope=await response.json();
  if(envelope.error)throw Error('CMS: '+safe(envelope.error.message||'RPC error'));
  const result=envelope.result;
  if(!result||result.isError)throw Error('CMS: '+safe(result?.content?.find(c=>c.type==='text')?.text||'Tool failed'));
  if(result.structuredContent!==undefined)return result.structuredContent;
  const text=result.content?.find(c=>c.type==='text')?.text;
  if(text===undefined)throw Error('CMS did not return JSON content.');
  return JSON.parse(text);
 };
}
const normalized=s=>String(s).normalize('NFC').trim().toLocaleLowerCase('en');
export function resolveFolder(requested,folders){
 const exact=folders.filter(f=>normalized(f)===normalized(requested));
 const candidates=exact.length?exact:folders.filter(f=>normalized(f.split('/').at(-1))===normalized(requested));
 if(candidates.length!==1)throw Error(candidates.length?'Ambiguous folder; choose an exact path: '+candidates.join(', '):'Folder not found. Read allowedFolders and ask for the correct name.');
 if(['Projects','Journal','Certificates','Site assets'].includes(candidates[0]))throw Error('Choose the specific project folder, not a shared library root.');
 return candidates[0];
}
export async function inventory(call,requested){
 const [architecture,media,projects]=await Promise.all([call('cms_media_architecture'),call('cms_media_list'),call('cms_list',{kind:'project'})]);
 const folder=resolveFolder(requested,architecture.allowedFolders||[]);
 const assets=media.filter(m=>m.folder===folder||m.folder?.startsWith(folder+'/')).map(m=>Object.fromEntries(['id','name','url','folder','type','alt','width','height','size'].filter(k=>m[k]!==undefined).map(k=>[k,m[k]])));
 const tail=folder.split('/').at(-1);
 return {folder,assets,projectCandidates:projects.filter(p=>p.id===tail||normalized(p.title)===normalized(tail)||normalized(p.id).includes(normalized(tail)))};
}
export function preflight(document,schema,{requireCaptions=true}={}){
 const errors=[],warnings=[],seen=new Set();
 if(requireCaptions)for(const key of ['fa','en','hashtags'])if(typeof document.announcement?.[key]!=='string'||!document.announcement[key].trim())errors.push('Missing social caption field: announcement.'+key);
 if(!/^[a-z0-9][a-z0-9-]{0,119}$/.test(document.id||'')||document.id==='new')errors.push('Invalid project slug.');
 if(!document.title?.trim())errors.push('Project title is empty.');
 if(!schema.industries?.includes(document.industry))errors.push('Select an industry from the live schema.');
 if(!schema.brandPersonalities?.some(p=>p.id===document.brandPersonality))errors.push('Select a personality from the live schema.');
 if(!['Product','Branding','Communication Design'].includes(document.discipline||document.category))errors.push('Select an existing discipline.');
 if(!document.coverImage)errors.push('Cover is missing.');
 if(!document.summary?.trim())errors.push('Summary is missing.');
 if(Buffer.byteLength(JSON.stringify(document))>600000)errors.push('Document exceeds 600 KB.');
 if(!Array.isArray(document.blocks)||!document.blocks.length)errors.push('Case study has no blocks.');
 for(const b of document.blocks||[]){
  if(!b.id||seen.has(b.id))errors.push('Missing or duplicate block ID: '+b.id);seen.add(b.id);
  if(!schema.blocks?.[b.type])errors.push('Unsupported block type: '+b.type);
  if(b.type==='text'&&!b.text?.trim())errors.push('Empty text section: '+b.id);
  if(b.type==='markdown'&&!b.markdown?.trim())errors.push('Empty markdown: '+b.id);
  if(b.type==='image'&&!b.image)errors.push('Empty image: '+b.id);
  if(b.type==='image'&&!b.alt?.trim())warnings.push('Add descriptive alt text: '+b.id);
  if(['grid','composition'].includes(b.type)&&(!b.images?.length||b.images.some(i=>!i)))errors.push('Empty grid slot: '+b.id);
  if(b.type==='html'&&!b.html?.trim())errors.push('Empty live UI: '+b.id);
  if(b.type==='html')warnings.push('Visually check live UI, state and height at 390/768/1440: '+b.id);
 }
 if(!document.references?.length)errors.push('Verified benchmark references are missing.');
 for(const r of document.references||[])if(!/^https:\/\//.test(r.url||'')||!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedAt||'')||!r.takeaway?.trim())errors.push('Incomplete benchmark reference.');
 return {ok:errors.length===0,errors,warnings,note:'Local structural checks only. Does not prove factual accuracy, benchmark access or visual quality.'};
}
async function save(path,value){await mkdir(dirname(resolve(path)),{recursive:true});await writeFile(path,JSON.stringify(value,null,2),{mode:0o600});}
async function main(){
 const [command,...args]=process.argv.slice(2);
 if(command==='preflight'){
  const [documentPath,schemaPath]=args;
  if(!documentPath||!schemaPath)throw Error('Usage: cms.mjs preflight document.json live-schema.json');
  const result=preflight(JSON.parse(await readFile(documentPath,'utf8')),JSON.parse(await readFile(schemaPath,'utf8')));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;return;
 }
 if(command!=='inventory'&&command!=='call')throw Error('Usage: cms.mjs inventory "folder" output.json | call cms_tool @arguments.json output.json [--write|--publish] | preflight document.json schema.json');
 const endpoint=process.env.DESARTLY_CMS_ENDPOINT||'https://studio.desartly.info/mcp';
 const call=createClient({endpoint,token:process.env.DESARTLY_CMS_TOKEN,cookie:process.env.DESARTLY_CMS_COOKIE});
 if(command==='inventory'){
  if(!args[0]||!args[1])throw Error('Folder and output file are required.');
  const result=await inventory(call,args[0]);await save(args[1],result);console.log(JSON.stringify({folder:result.folder,assets:result.assets.length,projectCandidates:result.projectCandidates.map(p=>({id:p.id,status:p.status})),saved:args[1]}));return;
 }
 const [name,input,output,...flags]=args;
 if(!name||!input||!output)throw Error('Tool name, JSON arguments (or @file) and output file are required.');
 if(flags.some(f=>!['--write','--publish'].includes(f))||flags.length>1)throw Error('Choose one valid permission flag.');
 const params=JSON.parse(input.startsWith('@')?await readFile(input.slice(1),'utf8'):input);
 const permission=flags[0]==='--publish'?'publish':flags[0]==='--write'?'write':'read';
 if(name==='cms_publish'){
  if(permission!=='publish')throw Error('Publishing needs --publish and an owner request to publish.');
  const current=await call('cms_get',{kind:params.kind,id:params.id});
  if(!Number.isInteger(params.version)||current.version!==params.version)throw Error('Version changed. Reread, review intended changes, then publish.');
 }
 const result=await call(name,params,permission);await save(output,result);
 console.log(JSON.stringify({tool:name,saved:output,...(result?.version!==undefined?{version:result.version}:{}),...(result?.url?{url:result.url}:{}),...(result?.document?{id:result.document.id}:{}),...(Array.isArray(result)?{count:result.length}:{})}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.name==='TimeoutError'?'CMS timed out. Reread state before retrying a write.':error.message);process.exitCode=1;});
