import test from 'node:test';
import assert from 'node:assert/strict';
import {projectTags,matchesCategory,projectIndustry} from '../src/project-tags.js';
test('taxonomy has one discipline and a separate industry; free-form tags never become filters',()=>{const p={category:'Advertising',tags:['Branding','Product Design'],industry:'OTA'};assert.deepEqual(projectTags(p),['Advertising','OTA']);assert.equal(matchesCategory(p,'Branding'),false);assert.equal(matchesCategory(p,'Advertising'),true);});
test('legacy product categories normalize and explicit industry overrides known project fallback',()=>{assert.deepEqual(projectTags({id:'flightio',category:'Product & AI'}),['Product','OTA']);assert.equal(projectIndustry({id:'flightio',industry:'TravelTech'}),'TravelTech');assert.equal(projectIndustry({id:'unrecognized'}),'');});
