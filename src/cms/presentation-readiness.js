const has=value=>typeof value==='string'&&value.trim().length>0;
const visible=block=>!block.hidden&&block.visible!==false;
const stories=doc=>(doc.blocks||[]).filter(b=>visible(b)&&['text','markdown'].includes(b.type)&&has(b.text||b.markdown));
const media=doc=>(doc.blocks||[]).filter(visible).flatMap(b=>b.type==='image'?[b.image]:['grid','composition'].includes(b.type)?b.images||[]:b.type==='html'?[b.staticImage]:[]).filter(has);
export const presentationCriteria=[
 ['title','Foundation','Project title','Name this project.',d=>has(d.title)],
 ['summary','Foundation','Project introduction','Add a short introduction in the summary field.',d=>has(d.summary)],
 ['cover','Foundation','Project cover','Choose a card cover or hero image.',d=>has(d.heroImage)||has(d.coverImage)],
 ['client','Foundation','Client or brand','Fill in the client or brand name.',d=>has(d.clientName)],
 ['role','Foundation','Your role','Describe your contribution in the role field.',d=>has(d.role)],
 ['deliverables','Foundation','Deliverables','List the work delivered for the project.',d=>has(d.deliverables)],
 ['industry','Foundation','Industry','Choose the project industry.',d=>has(d.industry)],
 ['discipline','Foundation','Design discipline','Choose the design discipline.',d=>has(d.discipline||d.category)],
 ['context','Story','Brand context','Introduce the brand in its description or a story section.',d=>has(d.clientDescription)||stories(d).length>0],
 ['challenge','Story','Design challenge','Fill in the challenge field.',d=>has(d.challenge)],
 ['story','Story','Core idea','Add a populated story section explaining the central idea.',d=>stories(d).length>=1],
 ['decisions','Story','Design decisions','Add a second populated story section for design choices.',d=>stories(d).length>=2],
 ['development','Story','Development narrative','Add a third populated story section for the design development.',d=>stories(d).length>=3],
 ['outcome','Story','Outcome','Fill in the outcome field.',d=>has(d.outcome)],
 ['references','Presentation','References','Add at least one benchmark URL.',d=>(d.references||[]).some(r=>has(r.url))],
 ['media','Presentation','Visual sections','Add at least one image to the project sections.',d=>media(d).length>0],
 ['credits','Presentation','Credits','Fill in the credits field.',d=>has(d.credits)],
 ['persian','Social caption','Persian caption','Write the Persian announcement.',d=>has(d.announcement?.fa)],
 ['english','Social caption','English caption','Write the English announcement.',d=>has(d.announcement?.en)],
 ['hashtags','Social caption','Hashtags','Add announcement hashtags.',d=>has(d.announcement?.hashtags)]
].map(([id,group,title,guidance,complete])=>({id,group,title,guidance,complete,points:5}));
export function presentationContentKey(doc){const value=JSON.stringify([doc.title,doc.summary,doc.coverImage,doc.heroImage,doc.brandColor,doc.clientName,doc.clientDescription,doc.discipline,doc.industry,doc.role,doc.challenge,doc.deliverables,doc.outcome,doc.credits,doc.references,doc.blocks,doc.announcement?.fa,doc.announcement?.en,doc.announcement?.hashtags]);let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
export function presentationReadiness(doc){const items=presentationCriteria.map(({complete,...item})=>({...item,checked:complete(doc)}));return {contentKey:presentationContentKey(doc),stale:false,items,score:items.reduce((n,item)=>n+(item.checked?item.points:0),0),checked:items.filter(i=>i.checked).length,total:items.length,label:'Automatic field completeness; not a design-quality or publication approval score.'};}
const legacyIds=['brief','cover','scope','taxonomy','context','challenge','idea','decisions','process','outcome','originality','quality','proportions','rhythm','typography','responsive','linkedin','instagram','caption','claims'];
export function validatePresentationReview(value){if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.contentKey!=='string'||!value.checks||typeof value.checks!=='object'||Array.isArray(value.checks))throw Error('Presentation review needs a content key and checkboxes.');if(value.contentKey.length>120||(value.notes!==undefined&&(typeof value.notes!=='string'||value.notes.length>4000)))throw Error('Review notes or content key exceed their limits.');for(const [key,checked]of Object.entries(value.checks))if((!legacyIds.includes(key)&&!presentationCriteria.some(c=>c.id===key))||typeof checked!=='boolean')throw Error('Invalid presentation checklist item.');}
