export function resolveHeroSlides(page={},projects=[]){
 const configured=Array.isArray(page.heroSlides)?page.heroSlides:null;
 const defaults=(page.selectedProjects?.length?page.selectedProjects:projects.slice(0,3).map(p=>p.id)).map(projectId=>({projectId}));
 return (configured||defaults).flatMap((slide,i)=>{const project=projects.find(p=>p.id===slide.projectId);return project?[{...slide,key:slide.id||`${project.id}-${i}`,project,image:slide.image||project.coverImage||''}]:[];});
}
