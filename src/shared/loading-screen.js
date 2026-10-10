// The HTML shell and React fallbacks share one critical loading style.
export const loadingCss = `
script,style,template{display:none!important}
.brand-loading{box-sizing:border-box;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:#fff;color:#202632;font-family:Manrope,Arial,sans-serif;padding:24px;text-align:center}
.brand-loading.inline{min-height:280px;background:transparent}
.brand-loading-logo{position:relative;font:800 42px/.95 Manrope,Arial,sans-serif;letter-spacing:-3px;color:#202632}
.brand-loading-logo sup{position:absolute;top:0;right:-12px;font:500 10px/1 Arial,sans-serif;letter-spacing:0}
.brand-loading-track{display:block;position:relative;width:176px;height:3px;border-radius:3px;overflow:hidden;background:#e8e9ef}
.brand-loading-track i{display:block;width:40%;height:100%;background:#202632;border-radius:inherit;animation:desartly-loading-progress 1.35s cubic-bezier(.4,0,.2,1) infinite;will-change:transform}
.brand-loading-label{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.brand-loading-error{font:13px/1.7 Arial,sans-serif;max-width:32ch;color:#5a6270}
.brand-loading-error a{display:inline-block;color:#202632;padding:12px;text-decoration:underline}
#desartly-boot{display:none;position:fixed;inset:0;z-index:10000}
html.desartly-booting #desartly-boot{display:flex}
html.desartly-booting #root{display:none}
@keyframes desartly-loading-progress{0%{transform:translateX(-110%)}100%{transform:translateX(360%)}}
@media(prefers-reduced-motion:reduce){.brand-loading-track i{animation:none;transform:translateX(75%);will-change:auto}}
`;
export const loadingHead = `<style id="desartly-loading-style">${loadingCss}</style><script>document.documentElement.classList.add('desartly-booting');setTimeout(function(){var node=document.getElementById('desartly-boot-error');if(node)node.hidden=false;},15000);</script>`;
export const loadingBody = `<div id="desartly-boot" class="brand-loading" role="status" aria-label="Loading website" aria-busy="true"><div class="brand-loading-logo" aria-hidden="true">Desartly<sup>®</sup></div><span class="brand-loading-track" aria-hidden="true"><i></i></span><div id="desartly-boot-error" class="brand-loading-error" hidden>This is taking longer than expected.<br><a href="">Reload this page</a></div></div>`;
export function loadingShell(html){return html.replace('<!--desartly-loading-head-->',()=>loadingHead).replace('<!--desartly-loading-body-->',()=>loadingBody);}
