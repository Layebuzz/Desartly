(()=>{
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const embedded=parent!==window;
 let parentTop=0,parentHeight=innerHeight,connected=false;
 const reveals=[...document.querySelectorAll('[data-reveal]')];
 const seen=new WeakSet();
 function reveal(el){if(seen.has(el))return;seen.add(el);el.style.opacity='1';if(!reduced)el.animate([{opacity:0,transform:'translate3d(0,30px,0)',filter:'blur(5px)'},{opacity:1,transform:'translate3d(0,0,0)',filter:'blur(0)'}],{duration:1100,delay:Number(el.dataset.delay||0),easing:'cubic-bezier(.16,1,.3,1)',fill:'both'})}
 function viewport(top,height){parentTop=top;parentHeight=height;for(const el of reveals){const y=el.getBoundingClientRect().top+scrollY;if(y<top+height*.97&&y+el.offsetHeight>top){reveal(el)}else if(!seen.has(el)){el.style.opacity='0'}}if(!reduced){document.querySelectorAll('[data-parallax]').forEach(el=>{const v=Math.max(-34,Math.min(55,(top-el.parentElement.offsetTop)*.075));el.style.transform=`translate3d(0,${v}px,0) scale(1.12)`})}}
 addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='desartly:preview-viewport')return;connected=true;viewport(Number(event.data.top)||0,Number(event.data.height)||innerHeight)});
 const size=()=>{const height=Math.ceil(document.body.getBoundingClientRect().height);if(embedded)parent.postMessage({type:'desartly:preview-size',height},'*')};
 new ResizeObserver(()=>{size();if(connected)viewport(parentTop,parentHeight)}).observe(document.body);
 document.fonts.ready.then(size);addEventListener('load',()=>{size();if(embedded)parent.postMessage({type:'desartly:preview-ready'},'*')});
 if(embedded){parent.postMessage({type:'desartly:preview-ready'},'*');setTimeout(()=>{if(!connected)reveals.forEach(reveal)},1500)}else{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)reveal(e.target)}),{threshold:.08});reveals.forEach(el=>{if(!reduced)el.style.opacity='0';io.observe(el)});addEventListener('scroll',()=>viewport(scrollY,innerHeight),{passive:true})}
 document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const target=document.querySelector(a.getAttribute('href'));if(!target)return;e.preventDefault();const top=target.getBoundingClientRect().top+scrollY;if(embedded)parent.postMessage({type:'desartly:preview-scroll',top},'*');else target.scrollIntoView({behavior:reduced?'instant':'smooth'})}));
 if(!reduced&&matchMedia('(pointer:fine)').matches){document.querySelectorAll('[data-magnetic]').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.12}px,${(e.clientY-r.top-r.height/2)*.16}px)`});el.addEventListener('pointerleave',()=>el.style.transform='')});document.querySelectorAll('[data-tilt]').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`perspective(1200px) rotateX(${-(e.clientY-r.top-r.height/2)*.013}deg) rotateY(${(e.clientX-r.left-r.width/2)*.013}deg)`});el.addEventListener('pointerleave',()=>el.style.transform='')})}
 window.afcSize=size;
})();
