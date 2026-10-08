import test from 'node:test';
import assert from 'node:assert/strict';
import {componentHtml,previewHtml} from '../src/cms/html-preview.js';
test('component preview retains scripts and full dependencies inside sandbox document',()=>{const html='<body><aside>dependency</aside><section class="panel">control</section><script>window.control=1</script></body>';assert.equal(componentHtml(html,''),html);const output=previewHtml(componentHtml(html,'.panel'),true);assert.ok(output.includes('<aside>dependency</aside>'));assert.ok(output.includes('window.control=1'));assert.ok(output.includes('document.querySelector(".panel")'));assert.ok(output.includes('Component selector did not match'));assert.ok(output.includes('desartly:preview-size'));});
test('selector cannot terminate the injected script',()=>{assert.ok(!componentHtml('<body></body>','</script><script>bad()').includes('document.querySelector("</script>'));});
