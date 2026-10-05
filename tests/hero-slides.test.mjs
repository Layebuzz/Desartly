import test from 'node:test';import assert from 'node:assert/strict';import {resolveHeroSlides} from '../src/hero-slides.js';
const projects=[{id:'a',coverImage:'/a.webp'},{id:'b',coverImage:'/b.webp'}];
test('hero respects configured order and count without filling removed slides',()=>{
 const slides=resolveHeroSlides({selectedProjects:['a','b'],heroSlides:[{projectId:'b',image:'/wide.webp'}]},projects);
 assert.equal(slides.length,1);assert.equal(slides[0].project.id,'b');assert.equal(slides[0].image,'/wide.webp');
});
test('unpublished or deleted projects never leak into the hero',()=>{
 assert.equal(resolveHeroSlides({heroSlides:[{projectId:'missing'}]},projects).length,0);
 assert.equal(resolveHeroSlides({heroSlides:[]},projects).length,0);
 assert.equal(resolveHeroSlides({},projects)[0].image,'/a.webp');
});
