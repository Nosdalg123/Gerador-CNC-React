const {cadControl,selectCadMode}=require('./cad-test-flow.cjs');
const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const fixture=require('../tests/fixtures/disco-7-gap.json');
function dxf(geometry){
 const pairs=(k,v)=>[String(k),String(v)],out=[...pairs(0,'SECTION'),...pairs(2,'HEADER'),...pairs(9,'$INSUNITS'),...pairs(70,4),...pairs(0,'ENDSEC'),...pairs(0,'SECTION'),...pairs(2,'ENTITIES')];
 for(const e of geometry){out.push(...pairs(0,e.type),...pairs(5,e.id),...pairs(8,e.layer||'PERFIL'));
  if(e.type==='LINE')out.push(...pairs(10,e.a[0]),...pairs(20,e.a[1]),...pairs(11,e.b[0]),...pairs(21,e.b[1]));
  else out.push(...pairs(10,e.c[0]),...pairs(20,e.c[1]),...pairs(40,e.r),...(e.type==='ARC'?[...pairs(50,e.start),...pairs(51,e.end)]:[]));
 }out.push(...pairs(0,'ENDSEC'),...pairs(0,'EOF'));return out.join('\r\n')+'\r\n';
}
async function main(){
 const url=process.env.CNC_TEST_URL;if(!url)throw Error('Use o teste leve com banco temporário.');const base=new URL(url),token=base.searchParams.get('token');
 const api=await require('./workspace-test-client.cjs').fixtureApi(url);
 const original=await api('load'),browser=await chromium.launch({channel:process.env.CNC_TEST_BROWSER||'msedge',headless:true}),page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];
 const model=()=>page.evaluate(()=>structuredClone(CNCDXFImport.getModel())),saved=()=>expect(page.locator('header .save-status')).toHaveText('Dados salvos neste dispositivo');
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 const root=path.resolve(__dirname,'../..','_modelos exemplo'),file=(await fs.readdir(root).catch(()=>[])).find(f=>f.startsWith('Disco')&&/\.dxf$/i.test(f));
 const mode=async value=>selectCadMode(page,value),click=async id=>page.locator('#dxfProjected [data-cad-segment="'+id+'"]').dispatchEvent('click');
 try{
  await page.goto(url);await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByLabel('Geometria').waitFor();await saved();
  await page.getByRole('button',{name:/Editor CAD DXF/}).click();await page.waitForFunction(()=>!!globalThis.CNCDXFImport);
  const payload=file?await fs.readFile(path.join(root,file)):Buffer.from(dxf([...fixture.geometry,...[80,60,40].map((r,i)=>({id:'C'+i,type:'CIRCLE',c:[337.7286449871,fixture.axis],r}))]));
  await cadControl(page,'#dxfFile').setInputFiles({name:file||'disco-7-recorte.dxf',mimeType:'application/dxf',buffer:payload});await cadControl(page,'#dxfZ0Right').click();await cadControl(page,'#dxfAxis').fill(String(fixture.axis));await cadControl(page,'#dxfLength').fill('109.5');await cadControl(page,'#dxfClear').click();
  const raw=await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal()));
  if(file){
   assert.equal(raw.geometry.length,116);assert.equal(raw.dimensions.length,15);
   const unwanted=await page.evaluate(()=>CNCDXFPerfil.segments(CNCDXFImport.getModel().geometry,CNCDXFImport.getRegion()).filter(s=>!['E5','E7','EA','EB','ED','EF','F1','F2','F3','F4'].includes(s.parent)).map(s=>s.uid));
   await mode('apagar');for(const id of unwanted)if(await page.locator('#dxfProjected [data-cad-segment="'+id+'"]').count())await click(id);
   await mode('quebrar');for(const id of ['F1:0','F2:0','F3:0'])await click(id);
   await mode('apagar');for(const id of ['F2__cad_0_1:0','F3__cad_0_1:0'])await click(id);
   await mode('estender');await click('F4:0');await cadControl(page,'#dxfExtendMode').selectOption('proxima');await cadControl(page,'#dxfExtendEnd').selectOption('fim');await cadControl(page,'#dxfExtendApply').click();await expect(cadControl(page,'#dxfStatus')).toContainText('até o eixo central');
   await cadControl(page,'#dxfUndo').click(); // Conservar a face original até o furo; extensão não é necessária para validar.
  }
  await cadControl(page,'#dxfClear').click();await mode('externo');for(const id of fixture.ids)await click(id);
  await expect(cadControl(page,'#dxfWarnings')).toContainText('0,003064 mm');await page.locator('.dxf-steps [data-dxf-go="3"]').click();assert.equal(await page.evaluate(()=>CNCDXFImport.getStep()),2);await expect(page.locator('#dxfPending')).toBeVisible();await expect(page.locator('#dxfSaveCNC')).toBeDisabled();
  const before=await model(),arcs=before.geometry.filter(e=>e.type==='ARC');await page.screenshot({path:'tests/disco-before.png',fullPage:true});
  await cadControl(page,'#dxfRepair').click();await expect(cadControl(page,'#dxfChecked')).not.toBeChecked();await expect(cadControl(page,'#dxfWarnings')).toContainText('Meia seção superior válida');await expect(cadControl(page,'#dxfChains')).toContainText('1 cadeias · 0 bifurcações · 2 pontas abertas');
  const corrected=await model();assert.deepEqual(corrected.geometry.filter(e=>e.type==='ARC'),arcs);assert.deepEqual(await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal())),raw);
  // Desfazer restaura inclusive a folga e exige conferir novamente.
  await cadControl(page,'#dxfUndo').click();assert.deepEqual(await model(),before);await page.locator('.dxf-steps [data-dxf-go="3"]').click();assert.equal(await page.evaluate(()=>CNCDXFImport.getStep()),2);await expect(page.locator('#dxfPending')).toBeVisible();await expect(page.locator('#dxfSaveCNC')).toBeDisabled();await cadControl(page,'#dxfRepair').click();await cadControl(page,'#dxfNome').fill('Disco 7 · perfil externo conferido');await cadControl(page,'#dxfChecked').check();await expect(cadControl(page,'#dxfSaveCNC')).toBeEnabled();
  await page.screenshot({path:'tests/disco-after.png',fullPage:true});await cadControl(page,'#dxfProjected').screenshot({path:'tests/disco-perfil.png'});await cadControl(page,'#dxfSaveCNC').click();await page.getByRole('button',{name:/Desenho da peça/}).click();await expect(page.locator('.piece-preview svg')).toBeVisible();await saved();
  const current=await api('load'),d=current.work,draft=current.cadDrafts.find(s=>s.id===d.cadOrigem.draftId);assert.equal(d.cadOrigem.verificado,true);assert.equal(d.lados,'2');assert.equal(d.trechos2[0].path.filter(s=>s.kind==='arc').length,4);assert.equal(d.trechos1[0].path.length,10);assert.equal(d.trechos1[0].path.filter(s=>s.kind==='arc').length,4);assert.ok(Math.abs(d.lPeca-109.5)<1e-6);assert.deepEqual(draft.sourceDoc,raw);assert.deepEqual(current.drawings.slice(0,original.drawings.length),original.drawings);assert.deepEqual(current.tools,original.tools);
  await page.reload();await page.getByRole('button',{name:/Desenho da peça/}).click();await page.getByRole('button',{name:'Editar contorno no CAD'}).click();await page.waitForFunction(()=>!!globalThis.CNCDXFImport?.getModel());assert.deepEqual(await model(),corrected);await cadControl(page,'#dxfChecked').check();await expect(cadControl(page,'#dxfSaveCNC')).toBeEnabled();
  assert.deepEqual(errors,[]);const result={originalRealDXF:!!file,sourceFile:file,sourceEntities:raw.geometry.length,sourceDimensions:raw.dimensions.length,length:109.5,diameter:162.8,arcs:4,gap:.0030639354081848686,gapBlocksSave:true,repairPreservesArcs:true,undo:true,saveConfirmed:true,reopenedAfterReload:true,existingDataPreserved:true,errors};
  await fs.writeFile('tests/disco-real-result.json',JSON.stringify(result,null,2));await fs.writeFile('tests/disco-transfer-result.json',JSON.stringify({format:'cnc-workspace',version:3,tools:[],drawings:[d],cadDrafts:[draft]},null,2));
  console.log('Disco 7 '+(file?'original':'recorte')+': folga reproduzida, ajuste, desfazer, salvamento e reabertura aprovados.');
 }catch(e){await page.screenshot({path:'tests/disco-failure.png',fullPage:true}).catch(()=>{});throw e}finally{await browser.close();await api('save',original)}
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});module.exports={dxf};
