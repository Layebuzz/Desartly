export const disciplines = ['Product', 'Branding', 'Communication Design'];
export function projectDiscipline(project) {
 const value = String(project.discipline || project.category || 'Product');
 if (/communicat|advert|campaign|packag|touchpoint/i.test(value)) return 'Communication Design';
 if (/brand|identity/i.test(value)) return 'Branding';
 return 'Product';
}
const knownIndustries = {flightio:'OTA','afc-qatar':'Sports & Events',airbnb:'Travel & Hospitality',digikala:'E-commerce',divar:'Classifieds',toypet:'Pet Care',myom:'Food & Beverage',noghteh:'Design & Creative Services','cafe-de-la-corte':'Food & Beverage','mci-5g':'Telecommunications'};
export function projectIndustry(project) {
 if (typeof project.industry === 'string' && project.industry.trim()) return project.industry.trim();
 const identity = `${project.id || ''} ${project.title || ''}`.toLowerCase();
 return Object.entries(knownIndustries).find(([name]) => identity.includes(name))?.[1] || '';
}
// Kept as a display helper for existing cards; free-form tags are never taxonomy.
export function projectTags(project) { return [projectDiscipline(project), projectIndustry(project)].filter(Boolean); }
export function matchesCategory(project, category) { return projectDiscipline(project) === projectDiscipline({category}); }
