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
    const upstream = await send(target,{method:request.method,headers,body:mutation?request.body:undefined,duplex:'half',redirect:'manual',signal:AbortSignal.timeout(25000)});
    const responseHeaders = new Headers(upstream.headers);
    for(const key of ['content-encoding','content-length','transfer-encoding','connection']) responseHeaders.delete(key);
    responseHeaders.set('Cache-Control','private, no-store');
    responseHeaders.set('X-Content-Type-Options','nosniff');
    const redirect=responseHeaders.get('Location');
    if(redirect?.startsWith(backend)) responseHeaders.set('Location',redirect.slice(backend.length)||'/');
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  } catch {
    return Response.json({error:'Content service unavailable. Please retry.'},{status:502});
  }
}
export default {fetch(request){return proxy(request);}};
