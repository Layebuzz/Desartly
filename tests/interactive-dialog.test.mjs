import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {dialogPreviewHtml} from '../src/cms/html-preview.js';
test('sandboxed preview forwards Escape but ignores ordinary keys',()=>{
 const html=dialogPreviewHtml('<html><body><button>Try</button></body></html>');
 assert.ok(html.includes('<button>Try</button>'));
 assert.ok(html.indexOf('preview-close')<html.indexOf('</body>'));
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 let handler; const messages=[];
 vm.runInNewContext(script,{addEventListener:(name,fn)=>{assert.equal(name,'keydown');handler=fn;},parent:{postMessage:message=>messages.push(message.type)}});
 handler({key:'Enter'});assert.equal(messages.length,0);
 let prevented=false;handler({key:'Escape',preventDefault:()=>{prevented=true;}});
 assert.equal(prevented,true);assert.deepEqual(messages,['desartly:preview-close']);
});
