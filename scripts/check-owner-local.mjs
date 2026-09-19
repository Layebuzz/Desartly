import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const vars=Object.fromEntries((await readFile(new URL('../.env.local',import.meta.url),'utf8')).trim().split('\n').map(line=>{const at=line.indexOf('=');return[line.slice(0,at),line.slice(at+1)]}));
const origin='http://127.0.0.1:5174';
const denied=await fetch(origin+'/about/edit',{redirect:'manual'});assert.equal(denied.status,302);
const response=await fetch(origin+'/api/owner/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:vars.OWNER_PASSWORD})});assert.equal(response.status,200);
const cookie=response.headers.get('set-cookie').split(';')[0];
const session=await fetch(origin+'/api/owner/session',{headers:{Cookie:cookie}});assert.equal((await session.json()).authenticated,true);
for(const path of ['/work/visual-identity/edit','/about/new']){const page=await fetch(origin+path,{headers:{Cookie:cookie},redirect:'manual'});assert.equal(page.status,200)}
console.log('PASS: anonymous access denied; real owner login, session and contextual routes verified. No credentials logged.');
