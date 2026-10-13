const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('@playwright/test');
async function main(){
 const directory=path.resolve(__dirname,'../public/assets'),svg=await fs.readFile(path.join(directory,'torno-cnc.svg'),'utf8'),browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.setContent('<style>html,body{margin:0;width:100%;height:100%}svg{width:100%;height:100%}</style>'+svg);
  const sizes=[16,24,32,48,64,128,256],frames=[];
  for(const size of [...sizes,1024]){await page.setViewportSize({width:size,height:size});const png=await page.screenshot({omitBackground:true});if(size===1024)await fs.writeFile(path.join(directory,'torno-cnc.png'),png);else frames.push(png)}
  const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
  sizes.forEach((size,i)=>{const at=6+i*16;header[at]=header[at+1]=size===256?0:size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(frames[i].length,at+8);header.writeUInt32LE(offset,at+12);offset+=frames[i].length});
  await fs.writeFile(path.join(directory,'torno-cnc.ico'),Buffer.concat([header,...frames]));console.log('Ícone: SVG, PNG 1024 e ICO com 7 resoluções exportados.');
 }finally{await browser.close()}
}main().catch(e=>{console.error(e);process.exitCode=1});
