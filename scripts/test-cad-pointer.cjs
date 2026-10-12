const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{dxf}=require('./test-disco-real.cjs'),{cadControl,selectCadMode}=require('./cad-test-flow.cjs');
const geometry=[{id:'target',type:'LINE',a:[50,120],b:[90,120]},{id:'keep',type:'LINE',a:[110,140],b:[150,140]},{id:'lower',type:'LINE',a:[50,80],b:[150,80]},...[80,60,40].map((r,i)=>({id:'C'+i,type:'CIRCLE',c:[400,100],r}))];
async function main(){
 const url=process.env.CNC_TEST_URL;if(!url)throw Error('Use o servidor de testes com banco temporário.');
 const base=new URL(url),token=base.searchParams.get('token'),api=async(route,data)=>{const r=await fetch(base.origin+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{'X-CNC-Token':token,'Content-Type':'application/json; charset=utf-8'},...(data===undefined?{}:{body:JSON.stringify(data)})});assert.equal(r.status,200);return r.json()};
 let original=await api('load');const browser=await chromium.launch({channel:process.env.CNC_TEST_BROWSER||'msedge',headless:true}),page=await browser.newPage({viewport:{width:2000,height:1200}}),errors=[],cases=[];
 page.on('pageerror',e=>errors.push(e.message));
 const model=()=>page.evaluate(()=>structuredClone(CNCDXFImport.getModel())),hidden=()=>page.evaluate(()=>[...CNCDXFImport.getHidden()]);
 async function drag(host,from,to,screenshot){
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});
  const box=await host.locator('#dxfDragOverlay').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});assert.ok(box,'Retângulo precisa ficar visível durante o arraste');
  for(const [name,expected] of Object.entries({x:Math.min(from.x,to.x),y:Math.min(from.y,to.y),width:Math.abs(to.x-from.x),height:Math.abs(to.y-from.y)}))assert.ok(Math.abs(box[name]-expected)<1.5,`${name}: retângulo ${box[name]} deve acompanhar mouse ${expected}`);
  if(screenshot)await host.screenshot({path:screenshot});await page.mouse.up();
 }
 try{
  await page.goto(url);await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:/Editor CAD DXF/}).click();await page.waitForFunction(()=>!!globalThis.CNCDXFImport);await expect(page.locator('header .save-status')).toHaveText('Dados salvos neste dispositivo');original??=await api('load');
  await cadControl(page,'#dxfFile').setInputFiles({name:'retangulo-mouse.dxf',mimeType:'application/dxf',buffer:Buffer.from(dxf(geometry))});await cadControl(page,'#dxfZ0Right').click();
  const raw=await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal()));
  // A delimitação da vista usa a mesma conversão de coordenadas da exclusão.
  await cadControl(page,'#dxfSelect').click();await page.locator('#dxfSource svg').scrollIntoViewIfNeeded();const src=await page.locator('#dxfSource svg').boundingBox();
  await drag(page.locator('#dxfSource'),{x:Math.round(src.x+src.width*.25),y:Math.round(src.y+src.height*.25)},{x:Math.round(src.x+src.width*.6),y:Math.round(src.y+src.height*.65)});
  await expect(page.locator('#dxfStatus')).toContainText('Vista delimitada');await cadControl(page,'#dxfSuggest').click();
  for(const [i,options] of [{width:2000,height:1200,face:'direita',zoom:false},{width:2000,height:1200,face:'esquerda',zoom:true},{width:1100,height:1000,face:'direita',zoom:false},{width:1100,height:1000,face:'esquerda',zoom:true}].entries()){
   await page.setViewportSize({width:options.width,height:options.height});await cadControl(page,options.face==='direita'?'#dxfZ0Right':'#dxfZ0Left').click();await cadControl(page,'#dxfZoomFit').click();
   const before=await model(),initialHidden=await hidden();
   if(options.zoom){
    await cadControl(page,'#dxfZoomIn').click();await cadControl(page,'#dxfPanMode').check();await page.locator('#dxfProjected svg').scrollIntoViewIfNeeded();
    const start=await page.locator('#dxfProjected [data-cad-segment="target:0"]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}),canvas=await page.locator('#dxfProjected svg').boundingBox(),point={x:Math.round(canvas.x+canvas.width*.25),y:Math.round(canvas.y+canvas.height*.5)};
    await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x-55,point.y+25,{steps:5});await page.mouse.up();
    const end=await page.locator('#dxfProjected [data-cad-segment="target:0"]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}});assert.ok(Math.abs(end.x-start.x+55)<1.5&&Math.abs(end.y-start.y-25)<1.5,'Desenho deve acompanhar exatamente o arraste: '+JSON.stringify({start,end}));await cadControl(page,'#dxfPanMode').uncheck();
   }
   await selectCadMode(page,'quadro');const target=page.locator('#dxfProjected [data-cad-segment="target:0"]');await target.scrollIntoViewIfNeeded();const b=await target.boundingBox(),center={x:Math.round(b.x+b.width*.2),y:Math.round(b.y+b.height/2)};
   const from={x:center.x-18,y:center.y-16},to={x:center.x+18,y:center.y+16};
   const vb=await page.locator('#dxfProjected svg').evaluate(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height}});if(i===0)assert.ok(Math.abs(vb.w/vb.h-900/480)>.1,'Caso largo deve exercitar margens do SVG');
   await drag(page.locator('#dxfProjected'),i%2?to:from,i%2?from:to,i===1?'tests/retangulo-mouse.png':null);
   assert.deepEqual(await hidden(),[...initialHidden,'target:0']);assert.deepEqual(await model(),before);await expect(page.locator('#dxfStatus')).toContainText('1 linha(s) removidas');
   await cadControl(page,'#dxfUndo').click();assert.deepEqual(await hidden(),initialHidden);assert.deepEqual(await model(),before);
   cases.push({...options,cursorAligned:true,onlyTargetRemoved:true,undo:true});
  }
  assert.deepEqual(await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal())),raw);assert.deepEqual(await api('load'),original);assert.deepEqual(errors,[]);
  await fs.writeFile('tests/cad-pointer-result.json',JSON.stringify({sourceSelectionAligned:true,cases,panFollowsMouse:true,sourceAndDataPreserved:true,errors},null,2));console.log('Mouse CAD: seleção e exclusão alinhadas, zoom, pan, Z0 dos dois lados e desfazer aprovados.');
 }catch(e){await page.screenshot({path:'tests/retangulo-mouse-failure.png',fullPage:true}).catch(()=>{});throw e}finally{await browser.close();if(original)await api('save',original)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
