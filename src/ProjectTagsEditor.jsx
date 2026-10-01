import React from 'react';
import { disciplines, projectDiscipline, projectIndustry } from './project-tags.js';
export function ProjectTagsEditor({ project, onChange }) {
 return <><label>Discipline<select value={projectDiscipline(project)} onChange={e=>onChange({discipline:e.target.value,category:e.target.value})}>{disciplines.map(value=><option key={value}>{value}</option>)}</select></label><label>Industry<input value={projectIndustry(project)} onChange={e=>onChange({industry:e.target.value})} placeholder="e.g. OTA, FinTech, Food & Beverage"/><small>The second layer of project filtering.</small></label></>;
}
