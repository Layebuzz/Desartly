import sharp from 'sharp';
import fs from 'node:fs';
const dir='public/projects/afc-qatar/';
const bg=(await sharp(dir+'sculpture.webp').png().toBuffer()).toString('base64');
const logo=(await sharp(dir+'afc-transparent.webp').png().toBuffer()).toString('base64');
const m=await sharp(dir+'afc-transparent.webp').metadata();
const svg=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200"><image xlink:href="data:image/png;base64,${bg}" width="1200" height="1200" preserveAspectRatio="xMidYMid slice"/><image xlink:href="data:image/png;base64,${logo}" x="96" y="90" width="180" height="${180*m.height/m.width}"/></svg>`);
const output=await sharp(svg).flatten({background:'#eee6da'}).webp({quality:88}).toBuffer();
const stats=await sharp(output).stats();if(stats.channels.every(c=>c.stdev<1))throw Error('Empty cover export');
fs.writeFileSync(dir+'cover-luxury.webp',output);
for(const width of [640,960]){await sharp(output).resize(width,width).webp({quality:83}).toFile(`public/projects/covers/afc-qatar-${width}.webp`);await sharp(output).resize(width,width).avif({quality:58}).toFile(`public/projects/covers/afc-qatar-${width}.avif`);}
console.log('Verified non-empty cover:',output.length,'bytes');
