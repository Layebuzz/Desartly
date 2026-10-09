import { S3Media } from './s3.js';

export class MediaStorage {
 constructor(env) {
  this.env=env;this.s3=env.S3_ENDPOINT&&env.S3_BUCKET&&env.S3_ACCESS_KEY&&env.S3_SECRET_KEY?new S3Media(env):null;
 }
 async usage({refresh=false}={}){if(!this.s3)throw Object.assign(Error('Cloud storage is not configured.'),{status:503});const key='media-usage:'+this.env.S3_BUCKET;if(!refresh){const cached=await this.env.DESARTLY_AUTH?.get(key,'json');if(cached&&Date.now()-Date.parse(cached.checkedAt)<300000)return cached;}const result=await this.s3.usage();await this.env.DESARTLY_AUTH?.put(key,JSON.stringify(result),{expirationTtl:300});return result;}
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
