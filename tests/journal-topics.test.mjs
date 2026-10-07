import test from 'node:test';
import assert from 'node:assert/strict';
import {journalTopicId, journalSearchText} from '../src/journal-topics.js';
test('Persian journal topics have distinct nonempty URL identifiers',()=>{
 assert.equal(journalTopicId('تجربهٔ طراحی'),'تجربه-طراحی');
 assert.notEqual(journalTopicId('تجربهٔ طراحی'),journalTopicId('هویت بصری'));
 assert.equal(journalTopicId('Product & AI'),'product-ai');
 const posts=[{category:'تجربهٔ طراحی'},{category:'Notes'}];
 const selected=new URLSearchParams({topic:journalTopicId(posts[0].category)}).get('topic');
 assert.equal(posts.filter(p=>journalTopicId(p.category)===selected).length,1);
});
test('Persian journal search normalizes Arabic letter variants and diacritics',()=>{
 assert.equal(journalSearchText('طراحي كاربري'),journalSearchText('طراحی کاربری'));
 assert.equal(journalSearchText('تجربهٔ طراحی'),'تجربه طراحی');
});
