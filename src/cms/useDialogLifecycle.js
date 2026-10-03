import {useEffect,useLayoutEffect,useRef} from 'react';
export function useDialogLifecycle(active,onClose){
 const close=useRef(onClose),opener=useRef(null);close.current=onClose;
 useEffect(()=>{const remember=e=>{if(!e.target.closest?.('[role=dialog]'))opener.current=e.target;};document.addEventListener('focusin',remember);return()=>document.removeEventListener('focusin',remember);},[]);
 useLayoutEffect(()=>{
  if(!active)return;
  const previous=opener.current||document.activeElement,overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  const key=e=>{if(e.key==='Escape'){e.preventDefault();close.current();}};
  document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[active]);
}
