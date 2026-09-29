export function projectTags(project) {
  const values = Array.isArray(project.tags) && project.tags.length ? project.tags : [project.category];
  return [...new Set(values.filter(value => typeof value === 'string').map(value => value.trim()).filter(Boolean))];
}
export function matchesCategory(project, category) {
  return projectTags(project).includes(category);
}
