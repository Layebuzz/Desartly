// Keep the complete document and its scripts intact while presenting one live component.
export function componentHtml(html,selector){
 if(!selector)return html;
 const literal=JSON.stringify(selector).replace(/</g,'\\u003c');
 const script=`<script>(()=>{function isolate(){let target;try{target=document.querySelector(${literal});}catch{}if(!target){document.body.textContent='Component selector did not match. Check the CMS preview.';return;}for(let node=target;node&&node!==document.body;node=node.parentElement){for(const sibling of node.parentElement.children){if(sibling!==node&&!['SCRIPT','STYLE','LINK'].includes(sibling.tagName))sibling.style.setProperty('display','none','important');}if(node!==target){for(const [key,value] of Object.entries({display:'block',width:'100%',height:'auto',minHeight:'0',margin:'0',padding:'0',maxWidth:'none'}))node.style[key]=value;}}Object.assign(document.body.style,{margin:'0',padding:'16px',minHeight:'0',height:'auto',boxSizing:'border-box'});Object.assign(target.style,{width:'100%',maxWidth:'none',boxSizing:'border-box'});}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',isolate):isolate();})();<\/script>`;
 return html.includes('</body>')?html.replace('</body>',script+'</body>'):html+script;
}
export function previewHtml(html,autoHeight){
 if(!autoHeight||html.includes('desartly:preview-size'))return html;
 const bridge=`<style>html{overflow:hidden}body{overflow:hidden}</style><script>(()=>{let queued=false;function send(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const body=document.body;if(!body)return;const style=getComputedStyle(body);const height=Math.max(100,Math.ceil(body.getBoundingClientRect().height+parseFloat(style.marginTop||0)+parseFloat(style.marginBottom||0)));parent.postMessage({type:'desartly:preview-size',height},'*');});}function start(){new ResizeObserver(send).observe(document.body);new MutationObserver(send).observe(document.body,{childList:true,subtree:true});document.fonts?.ready.then(send);send();}document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start):start();window.addEventListener('load',send);})();<\/script>`;
 return html.includes('</body>')?html.replace('</body>',bridge+'</body>'):html+bridge;
}

// Keyboard events do not bubble from sandboxed documents into the host dialog.
export function dialogPreviewHtml(html){
 const bridge=`<script>addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();parent.postMessage({type:'desartly:preview-close'},'*');}});<\/script>`;
 return html.includes('</body>')?html.replace('</body>',bridge+'</body>'):html+bridge;
}
