import { B2Media } from './b2.js';
import { S3Media } from './s3.js';

export class MediaStorage {
 constructor(env) {
  this.b2=new B2Media(env);
  this.s3=env.S3_ENDPOINT&&env.S3_BUCKET&&env.S3_ACCESS_KEY&&env.S3_SECRET_KEY?new S3Media(env):null;
 }
 put(id,bytes,type){return (this.s3||this.b2).put(id,bytes,type);}
 get(asset){
  if(asset.storage==='s3'){
   if(!this.s3)throw Object.assign(Error('Media storage is not configured.'),{status:503});
   return this.s3.get(asset);
  }
  if(asset.fileId)return this.b2.get(asset);
  throw Object.assign(Error('Invalid media asset.'),{status:503});
 }
}
