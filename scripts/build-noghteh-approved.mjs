import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const out=path.resolve('assets-source/noghteh/approved');
await fs.mkdir(out,{recursive:true});
const still='/Users/ali/Desktop/Cafe lacorte/ChatGPT Image Sep 24, 2026, 08_23_29 AM.png';
const space='/Users/ali/Desktop/Cafe lacorte/ChatGPT Image Sep 24, 2026, 08_23_18 AM.png';

const write=(source,name,options={})=>sharp(source).extract(options.extract||{left:0,top:0,width:options.width,height:options.height}).resize(options.resize||{width:2400,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,`${name}.webp`));
const a=await sharp(still).metadata(),b=await sharp(space).metadata();
await sharp(still).resize({width:2000,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,'cover.webp'));
await sharp(still).extract({left:0,top:135,width:a.width,height:Math.min(a.height-135,940)}).resize({width:2400,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,'still-life-wide.webp'));
await sharp(still).extract({left:390,top:445,width:830,height:470}).resize({width:2200,withoutEnlargement:true}).webp({quality:94,effort:6}).toFile(path.join(out,'brand-book-detail.webp'));
await sharp(still).extract({left:0,top:650,width:930,height:560}).resize({width:2200,withoutEnlargement:true}).webp({quality:94,effort:6}).toFile(path.join(out,'paper-detail.webp'));
await sharp(space).resize({width:2600,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,'environment.webp'));
await sharp(space).extract({left:0,top:55,width:690,height:850}).resize({width:1900,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,'environment-left.webp'));
await sharp(space).extract({left:430,top:55,width:960,height:720}).resize({width:2200,withoutEnlargement:true}).webp({quality:93,effort:6}).toFile(path.join(out,'environment-center.webp'));
await sharp(space).extract({left:900,top:250,width:520,height:560}).resize({width:1600,withoutEnlargement:true}).webp({quality:94,effort:6}).toFile(path.join(out,'reception-detail.webp'));
console.log({out,still:[a.width,a.height],space:[b.width,b.height]});
