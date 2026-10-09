import {imageSize} from './image-sizing.js';
import {responseError,reportRuntime} from './runtime-monitor.js';
export async function uploadFile(file,target=2400,folder='Site assets',options={}){
 const phase=value=>options.onPhase?.(value),check=()=>{if(options.signal?.aborted)throw new DOMException('Upload cancelled','AbortError');};
 check();phase('Preparing image');let blob=file;
 if(file.type.startsWith('image/')&&file.type!=='image/svg+xml'){
  const bitmap=await createImageBitmap(file);try{check();const canvas=document.createElement('canvas'),size=imageSize(bitmap.width,bitmap.height,target);canvas.width=size.width;canvas.height=size.height;canvas.getContext('2d').drawImage(bitmap,0,0,size.width,size.height);blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.92));if(!blob)throw Error('Could not process this image.');}finally{bitmap.close();}
 }
 check();if(blob.size>4*1024*1024)throw Error('Processed file exceeds 4 MB. Choose a smaller file or compress it.');
 const name=blob.type==='image/webp'?file.name.replace(/\.[^.]+$/,'')+'.webp':file.name;
 phase('Uploading');
 return new Promise((resolve,reject)=>{
  const xhr=new XMLHttpRequest();xhr.open('POST','/api/studio/upload');xhr.timeout=90000;
  const headers={'Content-Type':blob.type,'X-File-Name':encodeURIComponent(name),'X-Media-Folder':encodeURIComponent(folder),...(options.replaceId?{'X-Replace-Media':options.replaceId}:{})};
  for(const [key,value] of Object.entries(headers))xhr.setRequestHeader(key,value);
  xhr.upload.onprogress=e=>options.onProgress?.({loaded:e.loaded,total:e.lengthComputable?e.total:blob.size});
  xhr.upload.onload=()=>phase('Processing & saving');
  const abort=()=>xhr.abort();options.signal?.addEventListener('abort',abort,{once:true});
  xhr.onloadend=()=>options.signal?.removeEventListener('abort',abort);
  const fail=error=>{if(error.name!=='AbortError')reportRuntime('upload-error',error.message,{requestId:error.requestId,status:error.status});reject(error);};
  xhr.onabort=()=>fail(new DOMException('Upload cancelled','AbortError'));
  xhr.onerror=()=>fail(Error('Connection interrupted. Check your connection and retry this file.'));
  xhr.ontimeout=()=>fail(Error('Upload timed out while waiting for the server. Check the library before retrying to avoid a duplicate.'));
  xhr.onload=()=>{let data;const requestId=xhr.getResponseHeader('X-Request-Id');try{data=JSON.parse(xhr.responseText);}catch{fail(responseError(xhr.status,requestId));return;}if(xhr.status<200||xhr.status>=300){fail(responseError(xhr.status,requestId,data.error));return;}if(!data.item){fail(responseError(xhr.status,requestId,'The upload response did not include a saved file.'));return;}phase('Saved');resolve(data.item);};
  check();xhr.send(blob);
 });
}
