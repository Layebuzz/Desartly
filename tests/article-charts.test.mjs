import test from 'node:test';import assert from 'node:assert/strict';import {validateDocument} from '../server/cms-service.js';
const base={id:'test-chart',title:'Test',blocks:[{id:'chart',type:'chart',chartType:'bar',labels:['A','B'],values:[30,50],sample:true}]};
test('chart blocks preserve test labels and numeric data',()=>assert.deepEqual(validateDocument('article',base).blocks,base.blocks));
test('malformed charts are rejected before saving',()=>{for(const patch of [{values:[1]},{values:[NaN,4]},{chartType:'unknown'},{labels:[{},'B']},{points:'bad'},{source:{}},{labels:[],values:[]},{chartType:'radar',labels:['A','B','C'],values:[30,120,50]}])assert.throws(()=>validateDocument('article',{...base,blocks:[{...base.blocks[0],...patch}]}));});
