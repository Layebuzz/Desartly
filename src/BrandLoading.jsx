import React,{useLayoutEffect} from 'react';
import {loadingCss} from './shared/loading-screen.js';
const finishBoot=()=>{document.documentElement.classList.remove('desartly-booting');document.getElementById('desartly-boot')?.remove();};
export function BootReady({children}){useLayoutEffect(finishBoot,[]);return children;}
export function BrandLoading({label='Loading website…',inline=false}){
 useLayoutEffect(finishBoot,[]);
 return <div className={'brand-loading'+(inline?' inline':'')} role="status" aria-live="polite" aria-busy="true"><style>{loadingCss}</style><div className="brand-loading-logo" aria-hidden="true">Desartly<sup>®</sup></div><span className="brand-loading-track" aria-hidden="true"><i/></span><span className="brand-loading-label">{label}</span></div>;
}
