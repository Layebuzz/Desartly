import {studioOrigin} from '../server/site-domains.js';
import {optimizeRaster} from '../server/optimize-upload.js';
// Keep the existing D1 content and media service authoritative on both deployments.
const backend = 'https://desartly.layebuzz.workers.dev';
export async function proxy(request, send = fetch) {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('__route') || incoming.pathname;
  if (!(path.startsWith('/api/') || path === '/mcp') || /[\\?#]/.test(path) || path.includes('..'))
    return Response.json({error:'Not found'},{status:404});
  const origin = request.headers.get('Origin');
  const mutation = !['GET','HEAD','OPTIONS'].includes(request.method);
  if ((origin && origin !== incoming.origin) || (mutation && !origin && !(['/mcp','/api/cms/tools','/api/cms/upload'].includes(path) && request.headers.get('Authorization')?.startsWith('Bearer '))))
    return Response.json({error:'Request origin rejected.'},{status:403});
  const target = new URL(path, backend);
  for (const [key,value] of incoming.searchParams) if(key !== '__route') target.searchParams.append(key,value);
  const headers = new Headers();
  for (const key of ['accept','content-type','authorization','cookie','x-file-name','x-media-folder','x-media-alt','x-replace-media','x-skill-revision','mcp-protocol-version','mcp-session-id','last-event-id','range']) {
    const value=request.headers.get(key); if(value) headers.set(key,value);
  }
  if(origin) headers.set('Origin',backend);
  try {
    let body=mutation?request.body:undefined;
    const raster=['/api/studio/upload','/api/cms/upload'].includes(path)&&/^image\/(png|jpeg|webp|avif|gif)/.test(headers.get('content-type')||'');
    // Authenticate before image decoding; the content service still enforces write scopes.
    if(raster){
      const auth=await send(new URL('/api/cms/schema',backend),{headers,signal:AbortSignal.timeout(10000)});
      if(!auth.ok)return Response.json({error:'Sign in before uploading.'},{status:auth.status});
      const input=new Uint8Array(await request.arrayBuffer());body=await optimizeRaster(input);headers.set('content-type','image/webp');
    }
    if(['/mcp','/api/cms/tools'].includes(path)&&request.method==='POST'){
      const raw=await request.text();body=raw;
      let rpc;try{rpc=JSON.parse(raw);}catch{}
      const args=path==='/mcp'?rpc?.params?.arguments:rpc?.arguments;const toolName=path==='/mcp'?rpc?.params?.name:rpc?.name;
      if((path==='/api/cms/tools'||rpc?.method==='tools/call')&&toolName==='cms_upload'&&/^image\/(png|jpeg|webp|avif|gif)$/.test(args?.mimeType||'')){
        const auth=await send(new URL('/api/cms/schema',backend),{headers,signal:AbortSignal.timeout(10000)});
        if(!auth.ok)return Response.json({error:'An active CMS token is required.'},{status:auth.status});
        if(typeof args.base64!=='string'||args.base64.length>4200000)return Response.json({error:'MCP uploads must be smaller than 3 MB.'},{status:413});
        const output=await optimizeRaster(Buffer.from(args.base64,'base64'));
        args.base64=output.toString('base64');args.mimeType='image/webp';args.name=String(args.name||'Image').replace(/\.[^.]+$/,'')+'.webp';body=JSON.stringify(rpc);
      }
    }
    const upstream = await send(target,{method:request.method,headers,body,duplex:'half',redirect:'manual',signal:AbortSignal.timeout(25000)});
    const responseHeaders = new Headers(upstream.headers);
    for(const key of ['content-encoding','content-length','transfer-encoding','connection']) responseHeaders.delete(key);
    responseHeaders.set('Cache-Control','private, no-store');
    responseHeaders.set('X-Content-Type-Options','nosniff');
    const redirect=responseHeaders.get('Location');
    const localRedirect=redirect?.startsWith(backend)?redirect.slice(backend.length)||'/':redirect;
    if(localRedirect?.startsWith('/studio/')||localRedirect==='/studio')responseHeaders.set('Location',studioOrigin+localRedirect);
    else if(redirect?.startsWith(backend))responseHeaders.set('Location',localRedirect);
    if(upstream.status>=400&&!upstream.headers.get('Content-Type')?.includes('application/json')){
      const requestId=upstream.headers.get('X-Request-Id')||upstream.headers.get('CF-Ray')||crypto.randomUUID();
      console.error(JSON.stringify({event:'upstream-error',path,status:upstream.status,requestId}));
      return Response.json({error:upstream.status===413?'Processed file exceeds the upload limit.':'Content service could not finish the request. Check System logs and retry.',requestId},{status:upstream.status,headers:{'X-Request-Id':requestId,'Cache-Control':'no-store'}});
    }
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  } catch (error) {
    if(error.status)return Response.json({error:error.message},{status:error.status});
    const requestId=crypto.randomUUID();console.error(JSON.stringify({event:'proxy-error',path,requestId,reason:error.name}));
    return Response.json({error:'Content service unavailable. Please retry.',requestId},{status:502,headers:{'X-Request-Id':requestId,'Cache-Control':'no-store'}});
  }
}
export default {fetch(request){return proxy(request);}};
