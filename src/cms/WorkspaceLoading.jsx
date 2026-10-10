import React from 'react';
import './workspace-loading.css';
export function WorkspaceLoading({label='Opening your workspace…',inline=false}){return <div className={'workspace-loading'+(inline?' inline':'')} role="status" aria-live="polite" aria-busy="true"><span className="workspace-loading-mark" aria-hidden="true"><i/><i/><i/></span><strong>Desartly Studio</strong><p>{label}</p></div>;}
