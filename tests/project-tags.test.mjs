import test from 'node:test';
import assert from 'node:assert/strict';
import { projectTags, matchesCategory } from '../src/project-tags.js';

test('legacy projects retain their category filter', () => {
  assert.deepEqual(projectTags({category:'Branding'}), ['Branding']);
  assert.equal(matchesCategory({category:'Branding'}, 'Branding'), true);
});
test('one project appears in every assigned category without duplicate tags', () => {
  const project = {category:'Advertising',tags:['Branding',' Product Design ','Branding','']};
  assert.deepEqual(projectTags(project), ['Branding','Product Design']);
  assert.equal(matchesCategory(project,'Branding'), true);
  assert.equal(matchesCategory(project,'Product Design'), true);
  assert.equal(matchesCategory(project,'Advertising'), false);
});
