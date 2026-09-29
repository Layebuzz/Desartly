import React from 'react';
import './ClientProfile.css';

export function ClientProfile({ project }) {
  const name = project.clientName?.trim() || (project.clientLogo ? project.title : '');
  if (!name) return null;
  return (
    <aside className="client-profile" aria-label={`Client: ${name}`}>
      {project.clientLogo && <img className="client-profile-logo" src={project.clientLogo} alt={`${name} logo`} decoding="async" />}
      <div className="client-profile-content">
        <span className="client-profile-label">CLIENT</span>
        <strong className="client-profile-name">{name}</strong>
        {project.clientDescription?.trim() && <p className="client-profile-description">{project.clientDescription}</p>}
      </div>
    </aside>
  );
}
