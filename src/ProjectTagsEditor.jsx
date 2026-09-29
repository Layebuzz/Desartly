import React, { useEffect, useState } from 'react';
import { projectTags } from './project-tags.js';

export function ProjectTagsEditor({ project, onChange }) {
  const current = projectTags(project).join(', ');
  const [text, setText] = useState(current);
  useEffect(() => setText(current), [project.id, current]);
  function save() {
    const tags = [...new Set(text.split(',').map(value => value.trim()).filter(Boolean))];
    onChange({ tags, category: tags[0] || project.category });
  }
  return <label>Project tags<input value={text} onChange={event => setText(event.target.value)} onBlur={save} onKeyDown={event => {if(event.key === 'Enter'){event.preventDefault();event.currentTarget.blur();}}} placeholder="Branding, Product Design, Advertising"/><small>Separate tags with commas. Each tag is also a Work filter.</small></label>;
}
