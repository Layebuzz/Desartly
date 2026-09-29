import sharp from 'sharp';
import { join } from 'node:path';

const source = 'assets-source/airbnb';
const target = 'public/projects/airbnb';
const coral = '#ff5a5f';

function svgText(width, height, compact = false) {
  const fontSize = compact ? Math.round(width * 0.083) : Math.round(width * (width > height ? 0.068 : 0.075));
  const left = compact ? Math.round(width * 0.065) : Math.round(width * 0.065);
  const baseline = height - (compact ? Math.round(height * 0.115) : Math.round(height * 0.105));
  const lineGap = fontSize * 0.98;
  const logoWidth = compact ? Math.round(width * 0.14) : Math.round(width * (width > height ? 0.09 : 0.135));
  const gradientHeight = Math.round(height * (compact ? .37 : .36));
  return {fontSize,left,baseline,lineGap,logoWidth,gradientHeight};
}

async function extractWhiteLogo() {
  const path = join(source, 'brand-reference.png');
  const crop = { left: 550, top: 495, width: 820, height: 930 };
  const {data, info} = await sharp(path).extract(crop).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i=0; i<info.width*info.height; i++) {
    const src = i*3;
    const dest = i*4;
    const alpha = Math.max(0, Math.min(255, Math.round((Math.min(data[src+1],data[src+2])-92) * 255 / 155)));
    rgba[dest]=255; rgba[dest+1]=255; rgba[dest+2]=255; rgba[dest+3]=alpha;
  }
  return sharp(rgba,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}

const logo = await extractWhiteLogo();

async function campaignImage(input, output, {width, height, crop = false, compact = false} = {}) {
  const info = await sharp(input).metadata();
  width ||= info.width; height ||= info.height;
  const {fontSize,left,baseline,lineGap,logoWidth,gradientHeight} = svgText(width,height,compact);
  const logoHeight = Math.round(logoWidth * 930/820);
  const logoBuffer = await sharp(logo).resize({width:logoWidth}).png().toBuffer();
  const overlay = Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="shade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".77"/></linearGradient></defs><rect x="0" y="${height-gradientHeight}" width="${width}" height="${gradientHeight}" fill="url(#shade)"/><text x="${left}" y="${baseline-lineGap}" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-2">Unlock</text><text x="${left}" y="${baseline}" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" letter-spacing="-2">adventure.</text></svg>`);
  let base = sharp(input).resize(width,height,{fit:crop?'cover':'fill',position:'centre'});
  await base.composite([
    {input:overlay,top:0,left:0},
    {input:logoBuffer,top:Math.round(baseline-logoHeight),left:width-logoWidth-Math.round(width*.065)},
  ]).flatten({background:'#151515'}).webp({quality:88,effort:6}).toFile(join(target,output));
}

// Generated placement photographs have physical folds, glass and lighting already
// built into the scene. The final lockup is placed against the headline baseline.
async function outdoorPlacement(input, output, lockup) {
  const layers = [];
  if (lockup) {
    const logoBuffer = await sharp(logo).resize({width:lockup.width}).png().toBuffer();
    const logoHeight = Math.round(lockup.width * 930 / 820);
    layers.push({input:logoBuffer,left:lockup.left,top:Math.round(lockup.baseline-logoHeight)});
  }
  await sharp(join(source,input)).composite(layers).webp({quality:89,effort:6}).toFile(join(target,output));
}

for (const [name,out] of [
  ['arctic-bedroom.png','arctic-poster.webp'],
  ['rainforest-bedroom.png','rainforest-poster.webp'],
  ['savannah-bedroom.png','savannah-poster.webp'],
  ['antarctic-bedroom.png','antarctic-poster.webp'],
]) await campaignImage(join(source,name),out);

await campaignImage(join(source,'arctic-bedroom.png'),'plaza-screen-art.webp',{width:432,height:702,crop:true,compact:true});
await campaignImage(join(source,'rainforest-bedroom.png'),'shelter-screen-art.webp',{width:430,height:638,crop:true,compact:true});

await sharp(join(source,'kuwait-city-display.png')).composite([{input:join(target,'plaza-screen-art.webp'),left:420,top:68}]).webp({quality:88,effort:6}).toFile(join(target,'kuwait-plaza.webp'));
await sharp(join(source,'kuwait-plaza-v2-base.png')).composite([{input:join(target,'plaza-screen-art.webp'),left:420,top:68}]).webp({quality:88,effort:6}).toFile(join(target,'kuwait-plaza-v2.webp'));
await sharp(join(source,'kuwait-plaza-reflection.png')).webp({quality:89,effort:6}).toFile(join(target,'kuwait-plaza-reflection.webp'));
await sharp(join(source,'kuwait-bus-shelter.png')).composite([{input:join(target,'shelter-screen-art.webp'),left:924,top:121}]).webp({quality:88,effort:6}).toFile(join(target,'kuwait-shelter.webp'));

await outdoorPlacement('kuwait-blue-hour-streetboard.png','kuwait-blue-hour-streetboard.webp');
await outdoorPlacement('kuwait-rhino-streetboard-base.png','kuwait-rhino-streetboard.webp',{left:1250,width:116,baseline:678});
await outdoorPlacement('kuwait-giraffe-lightbox-base.png','kuwait-giraffe-lightbox.webp',{left:883,width:96,baseline:788});
await outdoorPlacement('kuwait-penguin-lightbox-base.png','kuwait-penguin-lightbox.webp',{left:1159,width:90,baseline:747});

const tile = await sharp({create:{width:600,height:600,channels:3,background:coral}}).composite([{input:await sharp(logo).resize({width:270}).png().toBuffer(),left:165,top:147}]).webp({quality:90,effort:6}).toFile(join(target,'client-logo.webp'));
const coverPhoto = await sharp(join(source,'coastal-bedroom.png')).resize(1200,800,{fit:'cover',position:'centre'}).toBuffer();
const coverType = Buffer.from('<svg width="1200" height="400" xmlns="http://www.w3.org/2000/svg"><text x="60" y="163" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" letter-spacing="-3">Unlock</text><text x="60" y="266" fill="white" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="700" letter-spacing="-3">adventure.</text></svg>');
await sharp({create:{width:1200,height:1200,channels:3,background:coral}}).composite([
  {input:coverPhoto,left:0,top:0},
  {input:coverType,left:0,top:800},
  {input:await sharp(logo).resize({width:182}).png().toBuffer(),left:942,top:862},
]).webp({quality:90,effort:6}).toFile(join(target,'cover-square.webp'));
console.log('Airbnb campaign assets built',tile.width,tile.height);
