import test from 'node:test';
import assert from 'node:assert/strict';
import {pageBody} from '../server/public-content.js';
test('HTML startup replacement preserves literal replacement tokens in project code',()=>{
 const source="<script>const sample = '$& $` $\'';</script>";
 const site={projects:[{id:'demo',title:'Demo',blocks:[{id:'live',type:'html',html:source}]}],pages:{}};
 const html=pageBody('<head></head><body><div id="root"></div><script src="app.js"></script></body>',site,'/work/demo');
 const data=html.match(/<script id="desartly-published"[^>]*>([\s\S]*?)<\/script>/)[1];
 assert.equal(JSON.parse(data).site.projects[0].blocks[0].html,source);
 assert.equal((html.match(/id="root"/g)||[]).length,1);
});
import vm from 'node:vm';
import {loadingShell} from '../src/shared/loading-screen.js';
test('critical loader starts before the body and preserves a no-JavaScript fallback',()=>{
 const shell=loadingShell('<head><!--desartly-loading-head--></head><body><div id="root"></div><!--desartly-loading-body--></body>');
 assert.ok(shell.indexOf('desartly-booting')<shell.indexOf('<body>'));
 assert.match(shell,/#desartly-boot\{display:none/);
 assert.match(shell,/prefers-reduced-motion:reduce/);
 assert.match(shell,/class="brand-loading-logo"/);
 assert.match(shell,/class="brand-loading-track"/);
 let className,timer;const doc={documentElement:{classList:{add:value=>className=value}},getElementById:()=>({hidden:true})};
 vm.runInNewContext(shell.match(/<script>([\s\S]*?)<\/script>/)[1],{document:doc,setTimeout:fn=>timer=fn});
 assert.equal(className,'desartly-booting');assert.equal(typeof timer,'function');
 const result=pageBody(shell,{projects:[],pages:{}},'/');assert.match(result,/<h1>Ali Komeili/);assert.match(result,/id="desartly-published" type="application\/json" hidden/);assert.match(result,/id="desartly-boot"/);
});
