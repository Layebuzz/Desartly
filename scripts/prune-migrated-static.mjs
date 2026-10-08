import {readFile,rm,stat,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import manifest from '../server/static-assets.json' with {type:'json'};
import receipt from '../server/static-migration.json' with {type:'json'};
// Prune build copies only. Keep recoverable source files in Git.
export async function pruneMigratedStatic(){let removed=0;
 async function requireManifest(path){for(const entry of await readdir(new URL('../public/'+path,import.meta.url),{withFileTypes:true})){const child=path+'/'+entry.name;if(entry.isDirectory())await requireManifest(child);else if(!Object.hasOwn(manifest,'/'+child))throw Error('New media belongs in CMS or needs verified migration: '+child);}}
 for(const root of ['projects','journal','images','presentation','brand'])await requireManifest(root);
 for(const [path,asset] of Object.entries(manifest)){
  if(!/^\/(projects|journal|images|presentation|brand)\//.test(path)||path.includes('..'))throw Error('Unsafe static path: '+path);
  const source=new URL('../public'+path,import.meta.url);const bytes=await readFile(source);
  if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256||receipt.assets[path]!==asset.sha256)throw Error('Static asset must be migrated and verified before deployment: '+path);
  const output=new URL('../dist'+path,import.meta.url);removed+=(await stat(output)).size;await rm(output);
 }
 console.log('Verified ParsPack media excluded from deployment:',Object.keys(manifest).length,'files,',removed,'bytes');
}
