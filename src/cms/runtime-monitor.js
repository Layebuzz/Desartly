let installed=false,count=0;
export function reportRuntime(event,message,details={}){
 if(count>=20)return;count++;
 const payload={event,message:String(message||'').slice(0,1000),path:location.pathname,...details};
 fetch('/api/runtime-log',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{});
}
export function installRuntimeMonitor(){if(installed)return;installed=true;window.addEventListener('error',e=>{if(e.message)reportRuntime('browser-error',e.message);});window.addEventListener('unhandledrejection',e=>reportRuntime('unhandled-rejection',e.reason?.message||'Unhandled promise rejection'));}
export function responseError(status,requestId,message){
 const fallback=status===413?'File exceeds the server upload limit.':status===401?'Your session expired. Sign in and retry.':status===409?'The library changed. Refresh and retry.':status===429?'Too many requests. Wait a moment and retry.':status>=500?'The server could not finish this request. Retry after checking System logs.':'The server returned an unreadable response.';
 const error=Error((message||fallback)+(requestId?' · Reference: '+requestId:''));error.status=status;error.requestId=requestId;return error;
}
