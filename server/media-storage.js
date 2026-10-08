import { S3Media } from './s3.js';

export class MediaStorage {
 constructor(env) {
  this.s3=env.S3_ENDPOINT&&env.S3_BUCKET&&env.S3_ACCESS_KEY&&env.S3_SECRET_KEY?new S3Media(env):null;
 }
 put(id,bytes,type){
  if(!this.s3)throw Object.assign(Error('Media storage is not configured.'),{status:503});
  return this.s3.put(id,bytes,type);
 }
 authorizeStatic(asset){if(!this.s3)throw Error('Media storage is not configured.');return this.s3.authorizeStatic(asset);}
 discardStaged(id){if(!this.s3)throw Error('Media storage is not configured.');return this.s3.discardStaged(id);}
 get(asset,range){
  if(asset.storage==='s3'){
   if(!this.s3)throw Object.assign(Error('Media storage is not configured.'),{status:503});
   return this.s3.get(asset,range);
  }
  throw Object.assign(Error('Invalid media asset.'),{status:503});
 }
}
