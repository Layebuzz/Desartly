export const presentationCriteria=[
 ['brief','Foundation','Title & concise introduction','Name the project and explain what was designed, for whom and why.'],
 ['cover','Foundation','Strong cover','Choose a sharp square cover, bold title, short description and project accent.'],
 ['scope','Foundation','Client, role & scope','Separate client, collaborators, your contribution and actual deliverables.'],
 ['taxonomy','Foundation','Industry & discipline','Use the specific market and one appropriate design discipline.'],
 ['context','Story','Brand & audience context','Introduce the brand and audience; distinguish supplied facts from interpretations.'],
 ['challenge','Story','Concrete design challenge','Explain the specific tension the design addresses.'],
 ['idea','Story','One central idea','State the idea that connects the visual system and applications.'],
 ['decisions','Story','Design decisions','Explain choices in type, colour, form or interaction with their purpose.'],
 ['process','Story','Process & development','Show meaningful exploration or evolution; distinguish sketches from finished work.'],
 ['outcome','Story','Outcome & reflection','Describe what was delivered, what you learned and remaining limits.'],
 ['originality','Visual craft','References & original work','Record benchmark URLs, dates and takeaways; identify stock references and mockups.'],
 ['quality','Visual craft','Source image quality','Inspect every image at export size; avoid extra recompression or unnecessary upscaling.'],
 ['proportions','Visual craft','Full images & correct ratios','Keep essential content intact; continuous panels must join without distortion or crop.'],
 ['rhythm','Visual craft','Visual rhythm','Alternate overview, detail and applications; avoid repetitive grids or long text runs.'],
 ['typography','Visual craft','Readable type & spacing','Review text measure, contrast, padding, gutters and header/footer alignment.'],
 ['responsive','Visual craft','Mobile & accessibility','Check small screens, image descriptions, keyboard focus and interactive sections.'],
 ['linkedin','Delivery','LinkedIn PDF reviewed','Open the actual landscape PDF; verify selectable text, vector logo, images and closing link.'],
 ['instagram','Delivery','Instagram export reviewed','Check 1080 × 1350 pages, large square cover, at most two profile slides and panorama seams.'],
 ['caption','Delivery','Bilingual social caption','Write an experience-led introduction, brand context, design story, distinct CTA and relevant hashtags.'],
 ['claims','Delivery','Claims, credits & publication','Confirm client status, facts and permissions; separate concepts, pitches and mockups from delivered work.']
].map(([id,group,title,guidance])=>({id,group,title,guidance,points:5}));
export function presentationContentKey(doc){const value=JSON.stringify([doc.title,doc.summary,doc.coverImage,doc.heroImage,doc.brandColor,doc.clientName,doc.clientDescription,doc.discipline,doc.industry,doc.role,doc.challenge,doc.deliverables,doc.outcome,doc.credits,doc.references,doc.blocks,doc.announcement?.fa,doc.announcement?.en,doc.announcement?.hashtags]);let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
export function presentationReadiness(doc){const contentKey=presentationContentKey(doc),saved=doc.presentationReview||{},stale=Boolean(saved.contentKey&&saved.contentKey!==contentKey),checks=stale?{}:saved.checks||{},items=presentationCriteria.map(item=>({...item,checked:checks[item.id]===true}));return {contentKey,stale,items,score:items.reduce((n,item)=>n+(item.checked?item.points:0),0),checked:items.filter(i=>i.checked).length,total:items.length,label:'Manual readiness review; not an automated design quality verdict.'};}
export function validatePresentationReview(value){if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value)||typeof value.contentKey!=='string'||!value.checks||typeof value.checks!=='object'||Array.isArray(value.checks))throw Error('Presentation review needs a content key and checkboxes.');if(value.contentKey.length>120||(value.notes!==undefined&&(typeof value.notes!=='string'||value.notes.length>4000)))throw Error('Review notes or content key exceed their limits.');for(const [key,checked]of Object.entries(value.checks))if(!presentationCriteria.some(c=>c.id===key)||typeof checked!=='boolean')throw Error('Invalid presentation checklist item.');}
