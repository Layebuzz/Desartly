// RIFF/WebP dimensions: https://developers.google.com/speed/webp/docs/riff_container
export function webpSize(bytes){
 const text=(start,length)=>new TextDecoder().decode(bytes.slice(start,start+length));
 if(bytes.length<20||text(0,4)!=='RIFF'||text(8,4)!=='WEBP')throw Error('Invalid WebP image.');
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 for(let offset=12;offset+8<=bytes.length;){const type=text(offset,4),length=v.getUint32(offset+4,true),p=offset+8;if(p+length>bytes.length)throw Error('Incomplete WebP image.');let width,height;
 if(type==='VP8X'&&length>=10){width=1+bytes[p+4]+(bytes[p+5]<<8)+(bytes[p+6]<<16);height=1+bytes[p+7]+(bytes[p+8]<<8)+(bytes[p+9]<<16);}
 if(type==='VP8L'&&length>=5&&bytes[p]===0x2f){const bits=v.getUint32(p+1,true);width=1+(bits&0x3fff);height=1+((bits>>>14)&0x3fff);}
 if(type==='VP8 '&&length>=10&&bytes[p+3]===0x9d&&bytes[p+4]===1&&bytes[p+5]===0x2a){width=v.getUint16(p+6,true)&0x3fff;height=v.getUint16(p+8,true)&0x3fff;}
 if(width&&height)return {width,height};offset=p+length+(length%2);
 }throw Error('WebP dimensions could not be read.');
}
