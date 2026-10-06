import {isVisibleProject} from './visibility.js';
const uses=(value,id)=>JSON.stringify(value||{}).includes('/api/media/'+id);
export function libraryFolders(state){
 const sites=[state.draft||state,state.published||{}];
 return [...new Set([...(state.customMediaFolders||[]),...sites.flatMap(s=>(s.projects||[]).filter(p=>isVisibleProject(p)||(!p.archived&&p.managed)).map(p=>state.mediaFolderLocations?.['Projects/'+p.id]||'Projects/'+p.id)),...sites.flatMap(s=>(s.blogPosts||s.articles||[]).filter(p=>!p.archived).map(p=>state.mediaFolderLocations?.['Journal/'+p.id]||'Journal/'+p.id)),'Certificates','Site assets'])].sort();
}
export function validateFolder(state,folder){
 if(!libraryFolders(state).includes(folder))throw Object.assign(Error('Choose a project, article, Certificates or Site assets folder. Create the content first; its folder is automatic.'),{status:400});
 return folder;
}
export function mediaOwnerFolder(state,item){
 const folders=libraryFolders(state);
 if((state.customMediaFolders||[]).includes(item.folder))return item.folder;
 for(const site of [state.draft,state.published].filter(Boolean)){
  for(const [field,prefix] of [['projects','Projects/'],['blogPosts','Journal/']])for(const doc of site[field]||[]){const folder=state.mediaFolderLocations?.[prefix+doc.id]||prefix+doc.id;if(folders.includes(folder)&&uses(doc,item.id))return folder;}
  if(uses(site.certificates,item.id))return 'Certificates';
 }
 // Preserve ownership of replacement assets still needed by previous revisions.
 const prior=folders.find(folder=>item.folder===folder||item.folder?.startsWith(folder+'/'));
 return prior||(/certificat/i.test(item.folder||'')?'Certificates':'Site assets');
}
export function organiseMedia(state){
 const next=structuredClone(state);next.mediaFolders=libraryFolders(next);
 for(const item of next.media||[])item.folder=mediaOwnerFolder(next,item);
 return next;
}
export const mediaArchitecture={
 version:2,folders:['Projects/<project-slug>','Journal/<article-slug>','Certificates','Site assets','Registered custom folders'],
 workflow:['Create the project or article draft first. Its single folder is created automatically.','Call cms_media_architecture to get the allowed folder paths.','Upload with cms_upload: folder, descriptive name, alt, mimeType and base64.','Use returned media URLs in native content blocks, then save and review.'],
 rules:['One folder per project and article; additional registered folders and nested upload folders are supported.','Certificates contains all credential-page media. Site assets contains shared site artwork.','Use lowercase kebab-case names: <project-slug>-<role>-<description>.webp. Example: vitanex-packaging-immune-boost.webp.','Reuse existing assets by URL. Do not duplicate files merely to put them in another folder.','Personality is internal CMS metadata, never a public filter.','Files referenced by drafts, publications or revision history are protected from deletion. Remove unused extras only after a backup; removal of a library record does not securely erase retained storage bytes.']
};
