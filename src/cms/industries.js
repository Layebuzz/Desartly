export const industries=['Agriculture','Automotive','Beauty & Personal Care','Biotechnology','Classifieds','Design & Creative Services','E-commerce','Education','Energy','Entertainment & Media','Fashion & Apparel','Finance & Insurance','Food & Beverage','Health & Wellness','Hospitality','Logistics','Manufacturing','Nonprofit','OTA','Pet Care','Real Estate','Retail','Sports & Events','Technology & SaaS','Telecommunications','Travel & Hospitality'];
const aliases = {
 'Agriculture & Farm Management':'Agriculture',
 'Biotechnology & Diagnostics':'Biotechnology',
 'Entertainment':'Entertainment & Media',
 'Restaurants & Hospitality':'Food & Beverage',
 'Fashion & Accessories':'Fashion & Apparel',
 'Sports & Mobility':'Sports & Events',
 'FinTech':'Finance & Insurance',
 'Music Education':'Education',
};
export function canonicalIndustry(value, {legacy=false}={}) {
 if(typeof value!=='string')return '';
 const name=value.normalize('NFKC').trim().replace(/\s+/g,' ');
 return industries.find(i=>i.toLowerCase()===name.toLowerCase()) || (legacy?aliases[name]||'':'');
}
export function validateIndustry(value, {allowEmpty=false}={}) {
 if(allowEmpty && (value===undefined || value===''))return '';
 const name=canonicalIndustry(value);
 if(!name)throw Object.assign(Error('Choose an industry from the approved list. Custom industry names are not allowed.'),{status:400});
 return name;
}
// Taxonomy-only migration. Never publishes draft content or changes historical revisions.
export function normalizeIndustryState(state) {
 const next=structuredClone(state),changes=[],unresolved=[];
 for(const stage of ['draft','published'])next[stage].projects=next[stage].projects.map(doc=>{
  if(!doc.industry)return doc;
  const industry=canonicalIndustry(doc.industry,{legacy:true});
  if(!industry){unresolved.push({stage,id:doc.id,industry:doc.industry});return doc;}
  if(industry===doc.industry)return doc;
  changes.push({stage,id:doc.id,from:doc.industry,to:industry});
  return {...doc,industry,_version:(doc._version||0)+1,updatedAt:new Date().toISOString()};
 });
 if(next.growthIndustries)next.growthIndustries=[...new Set(next.growthIndustries.map(i=>canonicalIndustry(i,{legacy:true})).filter(Boolean))];
 if(changes.some(c=>c.stage==='draft'))next.draftVersion=(next.draftVersion||0)+1;
 return {state:next,changes,unresolved};
}
