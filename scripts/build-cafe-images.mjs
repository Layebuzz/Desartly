import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const source='/Users/ali/Desktop/Cafe lacorte';
const output=path.resolve('assets-source/cafe-de-la-corte/final-v2');
fs.mkdirSync(output,{recursive:true});

async function enhance(input,name,width,height,position='centre'){
  await sharp(path.join(source,input),{failOn:'warning'})
    .rotate()
    .resize({width,height,fit:'cover',position,kernel:sharp.kernel.lanczos3})
    .modulate({saturation:1.025,brightness:1.01})
    .sharpen({sigma:.72,m1:.65,m2:2.1,x1:2.2,y2:10,y3:20})
    .webp({quality:94,alphaQuality:100,smartSubsample:true,effort:6})
    .toFile(path.join(output,name));
}

await enhance('Rectangle 17.png','hero-square.webp',2400,2400,'centre');
await enhance('Rectangle 33.png','product-detail-wide.webp',2400,1200,'centre');
await enhance('Rectangle 28.png','material-fibre-square.webp',1600,1600,'centre');
await enhance('Rectangle 34.png','material-glass-square.webp',1600,1600,'north');
await enhance('Rectangle 17.png','application-pour-wide.webp',2400,1200,'attention');
await enhance('Rectangle 30.png','application-label-wide.webp',2400,1200,'centre');

const bottle=await sharp(path.join(source,'image 3.png')).rotate().resize({height:1440,kernel:sharp.kernel.lanczos3}).sharpen({sigma:.65}).png().toBuffer();
const meta=await sharp(bottle).metadata();
const backdrop=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1600"><defs><radialGradient id="g" cx="50%" cy="43%" r="68%"><stop stop-color="#49301f"/><stop offset=".52" stop-color="#211a17"/><stop offset="1" stop-color="#0f1011"/></radialGradient><filter id="s"><feGaussianBlur stdDeviation="28"/></filter></defs><rect width="1600" height="1600" fill="url(#g)"/><ellipse cx="800" cy="1450" rx="430" ry="55" fill="#000" opacity=".58" filter="url(#s)"/><path d="M0 1280C400 1160 1180 1500 1600 1270V1600H0Z" fill="#17120f" opacity=".7"/></svg>`);
await sharp(backdrop).composite([{input:bottle,left:Math.round((1600-meta.width)/2),top:72}]).webp({quality:95,alphaQuality:100,effort:6}).toFile(path.join(output,'cover-square.webp'));

console.log(JSON.stringify(fs.readdirSync(output).sort().map(file=>({file,size:fs.statSync(path.join(output,file)).size})),null,2));
