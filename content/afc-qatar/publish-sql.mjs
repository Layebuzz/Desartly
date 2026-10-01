import fs from 'node:fs';
const revision=Number(process.argv[2]);if(!Number.isSafeInteger(revision))throw Error('Pass the expected production revision.');
const project=JSON.parse(fs.readFileSync(new URL('project.json',import.meta.url),'utf8'));
const data=JSON.stringify(project).replaceAll("'","''");
const sql=`WITH new_project(data) AS (SELECT json('${data}'))
UPDATE portfolio_state SET revision=revision+1,value=json_set(value,
'$.published.projects[#]',json((SELECT data FROM new_project)),
'$.draft.projects[#]',json((SELECT data FROM new_project)),
'$.revision',revision+1,'$.draftVersion',COALESCE(json_extract(value,'$.draftVersion'),0)+1,
'$.updatedAt',strftime('%Y-%m-%dT%H:%M:%fZ','now'),'$.publishedAt',strftime('%Y-%m-%dT%H:%M:%fZ','now'))
WHERE id=1 AND revision=${revision}
AND NOT EXISTS(SELECT 1 FROM json_each(portfolio_state.value,'$.published.projects') WHERE json_extract(value,'$.id')='afc-qatar')
AND NOT EXISTS(SELECT 1 FROM json_each(portfolio_state.value,'$.draft.projects') WHERE json_extract(value,'$.id')='afc-qatar')
RETURNING revision,json_array_length(value,'$.published.projects') AS published_projects,length(value) AS bytes;`;
fs.writeFileSync(process.argv[3]||'afc-publish.sql',sql);
console.log('Prepared guarded AFC publication SQL; '+Buffer.byteLength(sql)+' bytes.');
