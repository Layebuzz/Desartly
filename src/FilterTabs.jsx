import React,{useId} from 'react';
import {motion,useReducedMotion} from 'motion/react';
export function FilterTabs({items,value,onChange,label}){
 const id=useId(),reduced=useReducedMotion();
 return <div className="discovery-tabs" role="group" aria-label={label}>{items.map(item=><button key={item.id??'all'} aria-pressed={value===item.id} onClick={()=>onChange(item.id)}><span>{item.label}</span><sup>{String(item.count).padStart(2,'0')}</sup>{value===item.id&&<motion.i aria-hidden="true" layoutId={id} transition={{duration:reduced?0:.42,ease:[.22,1,.36,1]}}/>}</button>)}</div>;
}
