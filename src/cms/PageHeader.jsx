import React from 'react';
export function PageHeader({eyebrow,title,description,children}){return <header className="cms-page-header cms-heading"><div className="cms-page-heading-copy"><span className="cms-eyebrow">{eyebrow}</span><h1>{title}</h1>{description&&<p>{description}</p>}</div>{children&&<div className="cms-page-heading-actions">{children}</div>}</header>;}
