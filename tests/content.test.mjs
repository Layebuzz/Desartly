import test from 'node:test';
import assert from 'node:assert/strict';
import {composition} from '../src/layouts.js';
import {safeLink,slugify} from '../src/data.js';
test('all twenty composition presets have the intended slots, positive bounds and no overlaps',()=>{
 const expected=[2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6];
 expected.forEach((count,index)=>{const {width,height,boxes}=composition(index+1);assert.equal(boxes.length,count);boxes.forEach((a,i)=>{assert.ok(a.w>0&&a.h>0&&a.x>=0&&a.y>=0&&a.x+a.w<=width+.001&&a.y+a.h<=height+.001);boxes.slice(i+1).forEach(b=>{const overlaps=a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;assert.equal(overlaps,false,`overlapping slots in preset ${index+1}`)})})});
});
test('links accept site links and ordinary external links, reject executable or ambiguous URLs',()=>{
 for(const url of ['/work/post-123','/certificates','https://example.com/path','mailto:hello@example.com','tel:+123'])assert.equal(safeLink(url),url);
 for(const url of ['javascript:alert(1)','data:text/html,test','//evil.example','/\\evil.example','plain words',''])assert.equal(safeLink(url),'');
});
test('categories have stable slugs',()=>{
 assert.equal(slugify('Product & AI'),'product-ai');
});