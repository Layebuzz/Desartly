// Keep URLs ASCII-compatible with the CMS, including titles without Latin letters.
export function suggestSlug(title,fallback){const latin=title.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);return latin||fallback;}
