import React from 'react';
import {responseError,reportRuntime} from './runtime-monitor.js';
export const SiteContext=React.createContext(null);
export const EditingContext=React.createContext(null);
export const useSite=()=>React.useContext(SiteContext);
export function Editable({path,children,as:Tag='span',...props}){const editing=React.useContext(EditingContext);if(!editing)return <Tag {...props}>{children}</Tag>;return <Tag {...props} className={(props.className||'')+' direct-edit'} data-field={path.join('.')} tabIndex={0} contentEditable suppressContentEditableWarning onClick={e=>{e.preventDefault();e.stopPropagation();editing.select(path)}} onBlur={e=>editing.set(path,e.currentTarget.textContent)}>{children}</Tag>;}
export async function api(path,body){let response;try{response=await fetch(path,{credentials:'same-origin',...(body!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});let result;try{result=await response.json()}catch{throw responseError(response.status,response.headers.get('X-Request-Id'));}if(!response.ok)throw responseError(response.status,response.headers.get('X-Request-Id'),result.error);return result;}catch(error){if(!path.includes('/logs'))reportRuntime('api-error',error.message,{requestId:error.requestId,status:error.status});throw error;}}
export function event(name,path=location.pathname){fetch('/api/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event:name,path}),keepalive:true}).catch(()=>{});}
export function setAt(object,path,value){const copy=structuredClone(object);let target=copy;for(const key of path.slice(0,-1)){target[key]??={};target=target[key];}target[path.at(-1)]=value;return copy;}
export function getAt(object,path){return path.reduce((v,k)=>v?.[k],object);}
