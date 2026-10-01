import React from 'react';
import './ClientProfile.css';

export function ClientProfile({ project }) {
  const name = project.clientName?.trim() || (project.clientLogo ? project.title : '');
  if (!name) return null;
  return (
    <aside className="client-profile" aria-label={`Client: ${name}`}>
      <div className="client-profile-heading"><span className="client-profile-label">{project.clientLabel || 'THE CLIENT'}</span><span className="client-profile-line" aria-hidden="true" /></div>
      <div className="client-profile-body">
        <div className="client-profile-identity">
          {project.clientLogo && <img className="client-profile-logo" src={project.clientLogo} alt={`${name} logo`} decoding="async" />}
          <strong className="client-profile-name">{name}</strong>
        </div>
        {project.clientDescription?.trim() && <p className="client-profile-description">{project.clientDescription}</p>}
      </div>
    </aside>
  );
}
