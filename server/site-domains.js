export const publicOrigin='https://www.desartly.info';
export const studioOrigin='https://studio.desartly.info';
export function surfaceRoute(hostname,path,query=''){
 const privatePath=path==='/login'||path==='/admin'||path==='/studio'||path.startsWith('/studio/')||path==='/preview'||path.startsWith('/preview/')||path.startsWith('/edit/')||/\/(edit|new)\/?$/.test(path);
 const suffix=query?'?'+query:'';
 if(hostname==='studio.desartly.info'){
  if(path==='/')return {redirect:studioOrigin+'/studio'+suffix};
  if(privatePath)return {studio:true};
  return {redirect:publicOrigin+path+suffix};
 }
 if(privatePath)return {redirect:studioOrigin+path+suffix};
 return {public:true};
}
