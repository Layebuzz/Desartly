import {buildPresentation,buildInstagramPresentation} from './presentation-model.js';
// Hash only fields that contribute to the rendered PDF, plus a renderer version.
export const presentationRendererVersion='private-delivery-2026-10-09-v2';
export async function presentationVersion(project,format){
 const slides=(format==='instagram'?buildInstagramPresentation(project):buildPresentation(project)).slides;
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({renderer:presentationRendererVersion,format,slides})));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}
export function projectImages(project){
 const ordered=[project.heroImage||project.coverImage];
 for(const b of project.blocks||[]){if(b.hidden||b.visible===false)continue;if(b.type==='image')ordered.push(b.image);else if(['grid','composition'].includes(b.type))ordered.push(...(b.images||[]));else if(b.type==='html')ordered.push(b.staticImage);}
 return [...new Set(ordered.filter(x=>typeof x==='string'&&x))];
}
export function projectCaption(project,language='fa'){
 const value=project.announcement?.[language];if(!value?.trim())return null;
 const tags=project.announcement?.hashtags;return [value.trim(),Array.isArray(tags)?tags.join(' '):tags].filter(Boolean).join('\n\n');
}
