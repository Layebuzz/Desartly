// Versioned handoff for the future Telegram integration. No network delivery yet.
export function proposalPayload(item){
 const f=item.fields;
 return {schemaVersion:1,type:'proposal.requested',id:item.id,createdAt:item.createdAt,
  contact:{fullName:f.name,company:f.company||'',email:f.email,phone:f.phone||''},
  project:{services:String(f.services||'').split(',').map(s=>s.trim()).filter(Boolean),industry:f.industry||'',brief:f.message||''},
  source:'desartly-website'};
}
export function telegramProposalText(payload){
 return ['NEW PROPOSAL REQUEST','',`Name: ${payload.contact.fullName}`,`Company: ${payload.contact.company||'Not provided'}`,`Email: ${payload.contact.email}`,`Phone: ${payload.contact.phone||'Not provided'}`,'',`Services: ${payload.project.services.join(', ')}`,`Industry: ${payload.project.industry}`,'','BRIEF',payload.project.brief,'',`Request ID: ${payload.id}`,`Received: ${payload.createdAt}`].join('\n');
}
