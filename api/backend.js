import {optimizeRaster} from '../server/optimize-upload.js';
// Keep the existing D1/B2 content service authoritative on both deployments.
const backend = 'https://desartly.layebuzz.workers.dev';
export async function proxy(request, send = fetch) {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('__route') || incoming.pathname;
  if (!(path.startsWith('/api/') || path === '/mcp') || /[\\?#]/.test(path) || path.includes('..'))
    return Response.json({error:'Not found'},{status:404});
  const origin = request.headers.get('Origin');
  const mutation = !['GET','HEAD','OPTIONS'].includes(request.method);
  if ((origin && origin !== incoming.origin) || (mutation && !origin && !(path === '/mcp' && request.headers.get('Authorization')?.startsWith('Bearer '))))
    return Response.json({error:'Request origin rejected.'},{status:403});
  const target = new URL(path, backend);
  for (const [key,value] of incoming.searchParams) if(key !== '__route') target.searchParams.append(key,value);
  const headers = new Headers();
  for (const key of ['accept','content-type','authorization','cookie','x-file-name','mcp-protocol-version','mcp-session-id','last-event-id','range']) {
    const value=request.headers.get(key); if(value) headers.set(key,value);
  }
  if(origin) headers.set('Origin',backend);
  try {
    let body=mutation?request.body:undefined;
    const raster=path==='/api/studio/upload'&&/^image\/(png|jpeg|webp|avif|gif)/.test(headers.get('content-type')||'');
    // Authenticate before image decoding; the content service still enforces write scopes.
    if(raster){
      const auth=await send(new URL('/api/cms/state',backend),{headers,signal:AbortSignal.timeout(10000)});
      if(!auth.ok)return Response.json({error:'Sign in before uploading.'},{status:auth.status});
      const input=new Uint8Array(await request.arrayBuffer());body=await optimizeRaster(input);headers.set('content-type','image/webp');
    }
    if(path==='/mcp'&&request.method==='POST'){
      const raw=await request.text();body=raw;
      let rpc;try{rpc=JSON.parse(raw);}catch{}
      const args=rpc?.params?.arguments;
      if(rpc?.method==='tools/call'&&rpc.params?.name==='cms_upload'&&/^image\/(png|jpeg|webp|avif|gif)$/.test(args?.mimeType||'')){
        const auth=await send(new URL('/api/cms/state',backend),{headers,signal:AbortSignal.timeout(10000)});
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
    if(redirect?.startsWith(backend)) responseHeaders.set('Location',redirect.slice(backend.length)||'/');
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  } catch (error) {
    if(error.status)return Response.json({error:error.message},{status:error.status});
    return Response.json({error:'Content service unavailable. Please retry.'},{status:502});
  }
}
export default {fetch(request){return proxy(request);}};
