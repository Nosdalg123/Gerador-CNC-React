const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),{dxf}=require('./test-disco-real.cjs'),{cadControl,selectCadMode}=require('./cad-test-flow.cjs');
const arc=(id,c,r,start,end)=>({id,type:'ARC',c,r,start,end,layer:'perfil'}),line=(id,a,b)=>({id,type:'LINE',a,b,layer:'perfil'});
const touching=()=>[arc('A',[10,20],10,90.5,180),arc('B',[10,40],10,270.5,0)],separate=()=>[arc('A',[10,20],10,90,180),arc('B',[10.1,40.01],10,270,0)];
async function main(){
 const url=process.env.CNC_TEST_URL;if(!url)throw Error('Use o banco temporário do teste leve.');
 const base=new URL(url),token=base.searchParams.get('token'),api=await require('./workspace-test-client.cjs').fixtureApi(url);
 const original=await api('load'),browser=await chromium.launch({channel:process.env.CNC_TEST_BROWSER||'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const model=()=>page.evaluate(()=>structuredClone(CNCDXFImport.getModel())),selection=()=>page.evaluate(()=>[...CNCDXFImport.getSelected().externo]);
 const click=async id=>{const locator=cadControl(page,'#dxfProjected [data-cad-segment="'+id+'"]').first();await locator.scrollIntoViewIfNeeded();const pt=await locator.evaluate(path=>{const p=path.getPointAtLength(path.getTotalLength()/2),screen=new DOMPoint(p.x,p.y).matrixTransform(path.getScreenCTM());return {x:screen.x,y:screen.y}});await page.mouse.click(pt.x,pt.y)};
 const load=async geometry=>{
  const move=p=>[p[0]+50,p[1]+100],shifted=geometry.map(e=>e.type==='ARC'?{...e,c:move(e.c)}:{...e,a:move(e.a),b:move(e.b)});
  const fixture=[...shifted,line('LOWER',[50,80],[90,80]),...[80,60,40].map((r,i)=>({id:'C'+i,type:'CIRCLE',c:[400,100],r}))];
  await cadControl(page,'#dxfFile').setInputFiles({name:'conexao-arcos.dxf',mimeType:'application/dxf',buffer:Buffer.from(dxf(fixture))});await expect(page.locator('#dxfStatus')).toContainText('DXF CAD carregado');
  await cadControl(page,'#dxfZ0Right').click();await cadControl(page,'#dxfAxis').fill('100');
  const length=await page.evaluate(g=>CNCDXF.bounds(g).width,geometry);await cadControl(page,'#dxfLength').fill(String(length));
  await cadControl(page,'#dxfClear').click();await selectCadMode(page,'externo');for(const e of geometry)await click(e.id+':0');
 };
 try{
  await page.goto(url);await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:/Editor CAD DXF/}).click();await page.waitForFunction(()=>!!globalThis.CNCDXFImport);
  // Ligação automática real de arco/arco, com ângulos alterados e círculos intactos.
  await load(touching());const before=await model(),raw=await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal()));await expect(cadControl(page,'#dxfRepair')).toBeEnabled();await cadControl(page,'#dxfRepair').click();
  await expect(cadControl(page,'#dxfChains button')).toHaveCount(1);await expect(cadControl(page,'#dxfProjected [data-cad-corrected]')).toHaveCount(2);await expect(cadControl(page,'#dxfWarnings')).toContainText('Meia seção superior válida');const joined=await model();
  for(const e of before.geometry.filter(e=>e.type==='ARC')){const current=joined.geometry.find(s=>s.id===e.id);assert.equal(current.r,e.r);assert.deepEqual(current.c,e.c)}
  assert.deepEqual(await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal())),raw);await cadControl(page,'#dxfUndo').click();assert.deepEqual(await model(),before);
  // Conectar em dois cliques aceita um arco como primeiro e outro como segundo.
  await selectCadMode(page,'conectar');await click('A:0');await expect(cadControl(page,'#dxfConnectHint')).toContainText('Agora clique na segunda');await click('B:0');await expect(cadControl(page,'#dxfChains button')).toHaveCount(1);await expect(cadControl(page,'#dxfProjected [data-cad-corrected]')).toHaveCount(2);await cadControl(page,'#dxfUndo').click();assert.deepEqual(await model(),before);
  // Sem interseção: nova ligação pequena, já incluída no perfil, destacada e reversível.
  await load(separate());const bridgeBefore=await model(),bridgeRaw=await page.evaluate(()=>structuredClone(CNCDXFImport.getOriginal()));await cadControl(page,'#dxfRepair').click();const bridged=await model(),bridge=bridged.geometry.find(e=>e.cadRepair?.kind==='bridge');assert.ok(bridge);assert.ok((await selection()).includes(bridge.id+':0'));assert.deepEqual(bridged.geometry.filter(e=>e.type==='ARC'),bridgeBefore.geometry.filter(e=>e.type==='ARC'));
  await expect(cadControl(page,'#dxfCorrectionInfo')).toContainText('ligação reta curta criada');await expect(cadControl(page,'#dxfSuggestions')).toBeHidden();await expect(cadControl(page,'#dxfWarnings')).toContainText('Meia seção superior válida');await expect(cadControl(page,'#dxfProjected [data-cad-corrected]')).toHaveCount(1);await cadControl(page,'#dxfUndo').click();assert.deepEqual(await model(),bridgeBefore);await cadControl(page,'#dxfRepair').click();await page.screenshot({path:'tests/conexao-arcos.png',fullPage:true});
  await cadControl(page,'#dxfMeasuredLength').click();await cadControl(page,'#dxfNome').fill('Arcos ligados · sem perder círculos');await cadControl(page,'#dxfChecked').check();await expect(cadControl(page,'#dxfSaveCNC')).toBeEnabled();await cadControl(page,'#dxfSaveCNC').click();await expect(page.locator('header .save-status')).toHaveText('Dados salvos neste dispositivo');
  const saved=await api('load'),drawing=saved.work,draft=saved.cadDrafts.find(d=>d.id===drawing.cadOrigem.draftId);assert.equal(drawing.trechos1[0].path.filter(s=>s.kind==='arc').length,2);assert.equal(drawing.trechos1[0].path.filter(s=>s.kind==='line').length,1);assert.deepEqual(draft.sourceDoc,bridgeRaw);assert.equal(draft.corrections[0].kind,'bridge');
  await page.reload();await page.getByRole('button',{name:/Desenho da peça/}).click();await page.getByRole('button',{name:'Editar contorno no CAD'}).click();await page.waitForFunction(()=>!!globalThis.CNCDXFImport?.getModel());assert.deepEqual(await model(),bridged);await expect(cadControl(page,'#dxfProjected [data-cad-corrected]')).toHaveCount(1);
  // Conexão manual reta/arco pela interface, e ligação automática reta/arco.
  await load([arc('A',[10,20],10,100,180),line('B',[10,31],[10,40])]);await selectCadMode(page,'conectar');await click('A:0');await click('B:0');await expect(cadControl(page,'#dxfChains button')).toHaveCount(1);await expect(cadControl(page,'#dxfProjected [data-cad-corrected]')).toHaveCount(2);
  await load([line('A',[0,30],[10.1,30.01]),arc('B',[10.15,40],10,270,0)]);const lineArc=await model();await cadControl(page,'#dxfRepair').click();await expect(cadControl(page,'#dxfChains button')).toHaveCount(1);assert.deepEqual((await model()).geometry.filter(e=>e.type==='ARC'),lineArc.geometry.filter(e=>e.type==='ARC'));
  const final=await api('load');assert.deepEqual(final.tools,original.tools);assert.deepEqual(final.drawings.slice(0,original.drawings.length),original.drawings);assert.deepEqual(errors,[]);
  await fs.writeFile('tests/dxf-arc-connections-result.json',JSON.stringify({manualArcArc:true,manualLineArc:true,autoArcArc:true,autoLineArc:true,bridgeExplicitAndSelected:true,circlesPreserved:true,greenCorrections:true,undo:true,saveNativeArcsAndBridge:true,reopened:true,originalAndExistingDataPreserved:true,errors},null,2));console.log('Conexões de arcos: dois cliques, Ligar falhas, círculos preservados, ligação curta, desfazer, CNC e reabertura aprovados.');
 }catch(e){await page.screenshot({path:'tests/conexao-arcos-failure.png',fullPage:true}).catch(()=>{});throw e}finally{await browser.close();await api('save',original)}
}
main().catch(e=>{console.error(e);process.exitCode=1});
