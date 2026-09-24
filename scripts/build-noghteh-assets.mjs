import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const out=path.resolve('assets-source/noghteh/final');
await fs.mkdir(out,{recursive:true});

const generated={
  cover:'/Users/ali/.codex/generated_images/01a094bc-3c6e-76e2-b06a-afbd052886ba/exec-04db2a90-f6f0-43f5-ad49-8a6eccb01e7f.png',
  stationery:'/Users/ali/.codex/generated_images/01a094bc-3c6e-76e2-b06a-afbd052886ba/exec-5687de63-253e-42b7-8231-082db4ff119c.png',
  environment:'/Users/ali/.codex/generated_images/01a094bc-3c6e-76e2-b06a-afbd052886ba/exec-89608093-b7c5-4225-a09f-6191042651e7.png'
};
for(const [name,file] of Object.entries(generated)) await sharp(file).resize({width:name==='cover'?1800:2400,withoutEnlargement:true}).webp({quality:91,effort:6}).toFile(path.join(out,`${name}.webp`));

const mark=`<g id="mark" fill="currentColor"><path d="M0 88a56 56 0 0 1 56-56h16v56h56V32l44 44h28a56 56 0 0 1 56 56h40a56 56 0 0 1 56-56h12V32h44l44 44v68H56A56 56 0 0 1 0 88Z"/><rect x="300" y="0" width="52" height="32" rx="16"/><path d="M364 0l44 44h-44z"/></g>`;
const shell=(w,h,body,bg='#f4f2ee',fg='#343638')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img"><rect width="100%" height="100%" fill="${bg}"/><style>text{font-family:Arial,Helvetica,sans-serif;fill:${fg}}.hair{stroke:${fg};stroke-width:2;fill:none}.muted{opacity:.34}</style><g style="color:${fg}">${body}</g></svg>`;
const system=shell(2400,1350,`<defs>${mark}</defs><text x="120" y="130" font-size="28" letter-spacing="7">NOGHTEH / IDENTITY SYSTEM</text><line class="hair muted" x1="120" y1="178" x2="2280" y2="178"/><g transform="translate(120 265) scale(2.35)"><use href="#mark"/></g><text x="120" y="770" font-size="176" font-weight="700" letter-spacing="-9">ONE POINT.</text><text x="120" y="930" font-size="176" font-weight="700" letter-spacing="-9">MANY FORMS.</text><g transform="translate(1600 300)">${Array.from({length:4},(_,r)=>Array.from({length:4},(_,c)=>`<g transform="translate(${c*142} ${r*142}) rotate(${(r+c)%4*90} 50 50)"><circle cx="32" cy="32" r="26" fill="currentColor"/><path d="M75 6h52v52H75z" opacity="${.18+(r+c)*.04}"/><path d="M75 92h52v52H75z"/><path d="M6 92h52v52H6z" opacity=".45"/></g>`).join('')).join('')}</g><text x="1600" y="1125" font-size="24" letter-spacing="5">MODULE / 01—16</text>`);
const sequence=shell(2400,1350,`<defs>${mark}</defs><text x="120" y="125" font-size="26" letter-spacing="6">FORM FOLLOWS A POINT</text><text x="2040" y="125" font-size="26" text-anchor="end">01—05</text><line class="hair muted" x1="120" y1="175" x2="2280" y2="175"/>${[0,1,2,3,4].map((n,i)=>`<g transform="translate(${150+i*438} 360)"><circle cx="82" cy="82" r="${18+i*11}" fill="currentColor" opacity="${.25+i*.15}"/><path d="M0 380h310" class="hair muted"/><text x="0" y="435" font-size="22" letter-spacing="4">0${i+1}</text>${i===4?`<g transform="translate(-48 90) scale(.72)"><use href="#mark"/></g>`:`<path d="M${40+i*12} ${190-i*10}h${80+i*25}v${80+i*15}h-${80+i*25}z" fill="none" stroke="currentColor" stroke-width="12"/>`}</g>`).join('')}<text x="120" y="1240" font-size="54" letter-spacing="1">A modular language built to move from mark to pattern to space.</text>`,'#343638','#f4f2ee');
const type=shell(2400,1600,`<defs>${mark}</defs><g transform="translate(120 120) scale(1.25)"><use href="#mark"/></g><text x="2250" y="150" text-anchor="end" font-size="24" letter-spacing="5">NOGHTEH DESIGN HOUSE</text><text x="90" y="785" font-size="360" font-weight="700" letter-spacing="-25">NOGHTEH</text><line class="hair" x1="110" y1="875" x2="2290" y2="875"/><text x="110" y="980" font-size="30" letter-spacing="6">POINT</text><text x="720" y="980" font-size="30" letter-spacing="6">PRECISION</text><text x="1430" y="980" font-size="30" letter-spacing="6">POSSIBILITY</text><circle cx="150" cy="1270" r="92" fill="currentColor"/><path d="M610 1178h184v184H610z" fill="currentColor" opacity=".65"/><path d="M1110 1362V1178h184z" fill="currentColor"/><path d="M1610 1178h184a92 92 0 0 1-184 0z" fill="currentColor" opacity=".42"/><path d="M2070 1178a92 92 0 1 1 0 184z" fill="currentColor"/>`);
for(const [name,svg] of Object.entries({system,sequence,type})){
  await fs.writeFile(path.join(out,`${name}.svg`),svg);
  await sharp(Buffer.from(svg)).webp({quality:94,effort:6}).toFile(path.join(out,`${name}.webp`));
}
console.log(out);
