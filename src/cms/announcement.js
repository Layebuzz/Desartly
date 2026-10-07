export function announcementText(value={}){return [value.fa?.trim(),value.en?.trim(),value.hashtags?.trim()].filter(Boolean).join('\n\n');}
export function validateAnnouncement(value){if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Announcement must contain Persian and English text.');for(const key of ['fa','en','hashtags','notes'])if(value[key]!==undefined&&(typeof value[key]!=='string'||value[key].length>16000))throw Error('Announcement '+key+' must be text of at most 16,000 characters.');}

export const announcementStandard = {
 reference: 'MyOm project announcement',
 order: ['Persian: four paragraphs', 'English: same four paragraphs', 'Hashtags: one per line'],
 paragraphs: ['Open with a first-person design experience and the actual project scope; the informal :) is optional.', 'Introduce the brand and its audience in one short paragraph.', 'Describe your concrete design decisions and the part of the experience you found most interesting. Use visible work and confirmed facts.', 'Invite readers who need visual identity, packaging or visual communication to message you for a tailored collaboration proposal.'],
 voice: 'Conversational Persian in Ali’s first-person voice; natural English with the same meaning. Preserve paragraph spacing. Do not reduce the story to a single portfolio summary.',
 evidence: 'Do not copy MyOm-specific organic or international claims into another project. Never invent research, client reactions, launch status or commercial outcomes. Put unresolved facts in private notes.',
 privacy: 'CMS-only caption. Saving or publishing a project never authorizes posting the announcement to social media.'
};
