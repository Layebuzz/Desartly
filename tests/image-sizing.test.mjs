import test from 'node:test';
import assert from 'node:assert/strict';
import {imageSize} from '../src/cms/image-sizing.js';
test('image optimization fits landscape and portrait slots without cropping or upscaling',()=>{
  assert.deepEqual(imageSize(6000,4000,1600),{width:1600,height:1067});
  assert.deepEqual(imageSize(4000,6000,1200),{width:800,height:1200});
  assert.deepEqual(imageSize(400,300,2400),{width:400,height:300});
  assert.deepEqual(imageSize(6000,6000,99999),{width:2560,height:2560});
  assert.throws(()=>imageSize(0,4000));
});
