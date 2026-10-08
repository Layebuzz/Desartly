import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {zipSync,strToU8} from 'fflate';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export const skillFiles=['SKILL.md','agents/openai.yaml','references/api.md','references/story.md','references/disciplines.md','scripts/cms.mjs'];
export async function packageCaseStudySkill(){
 const root=new URL('../skills/desartly-case-study/',import.meta.url),entries={};
 for(const name of skillFiles)entries['desartly-case-study/'+name]=[strToU8(await readFile(new URL(name,root),'utf8')),{mtime:new Date('2026-10-09T00:00:00Z')}];
 const bytes=zipSync(entries,{level:9});
 const output=new URL('../public/downloads/desartly-case-study.zip',import.meta.url);
 await mkdir(new URL('./',output),{recursive:true});await writeFile(output,bytes);
 return {path:output.pathname,bytes:bytes.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)console.log(JSON.stringify(await packageCaseStudySkill()));
