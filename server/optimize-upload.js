import sharp from 'sharp';
export async function optimizeRaster(bytes){
 if(bytes.length>4*1024*1024)throw Object.assign(Error('Upload a file smaller than 4 MB.'),{status:413});
 try{const image=sharp(bytes,{limitInputPixels:40000000,animated:false});return await image.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:86}).toBuffer();}catch{throw Object.assign(Error('This image could not be processed. Use a valid PNG, JPEG or WebP image.'),{status:415});}
}
