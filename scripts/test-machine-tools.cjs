const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs/promises');
async function main(){
 const browser=await chromium.launch({channel:process.env.CNC_TEST_BROWSER||'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.CNC_TEST_URL||'http://127.0.0.1:5175');
  await expect(page.locator('.login-screen')).not.toContainText('React');
  await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await page.getByLabel('Geometria').waitFor();
  await page.getByLabel('Geometria').selectOption('matriz_solida');await expect(page.getByLabel('Código CNC gerado')).not.toHaveValue('');
  const saved=()=>expect(page.locator('header .save-status')).toHaveText('Dados salvos neste dispositivo');
  const load=()=>page.evaluate(async()=>globalThis.desktop?await globalThis.desktop.loadWorkspace():JSON.parse(localStorage.getItem('cnc.react.workspace.v3')));
  await saved();const before=await load(),code=await page.getByLabel('Código CNC gerado').inputValue();
  await expect(page.locator('.brand strong')).toHaveText('TORNO CNC');await expect(page.locator('.brand small')).toHaveText('Versão '+require('../package.json').version);await expect(page.locator('.autoria')).toHaveText('Desenvolvido por Gladson Bernardo');
  await page.getByRole('button',{name:/Comando:/}).click();await expect(page.getByRole('dialog',{name:'Selecionar máquina'})).toBeVisible();
  await page.screenshot({path:'tests/maquina-popup.png'});
  await page.getByRole('button',{name:/^Siemens/}).click();await expect(page.getByRole('button',{name:'Comando: Siemens'})).toBeVisible();await saved();
  await expect(page.getByLabel('Código CNC gerado')).toHaveValue(code);
  const after=await load();assert.deepEqual(after,{...before,form:{...before.form,maq:{...before.form.maq,comando:'siemens'}}});
  await page.reload();await expect(page.getByRole('button',{name:'Comando: Siemens'})).toBeVisible();
  await page.getByRole('button',{name:/Comando:/}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Selecionar máquina'})).not.toBeVisible();
  await expect(page.getByRole('button',{name:'Comando: Siemens'})).toBeFocused();
  await page.getByRole('button',{name:/Comando:/}).click();await page.getByRole('button',{name:/^Fanuc/}).click();await saved();
  await page.getByRole('button',{name:/Ferramentas$/}).first().click();
  const first=before.tools[0];await page.getByRole('row').filter({has:page.getByRole('cell',{name:first.nome,exact:false})}).first().getByRole('button',{name:'Editar',exact:true}).click();
  const modal=page.getByRole('dialog',{name:'Cadastro de ferramenta'});
  await expect(modal.locator('legend')).toHaveText(['Identificação','Incrementos e sobremetal · mm','Rotação e avanços de corte','Pastilha e observações','Geometria e suporte']);
  const nameBox=await page.getByLabel('Nome',{exact:true}).boundingBox(),numberBox=await page.getByLabel('Tipo',{exact:true}).boundingBox();assert.ok(nameBox.width>numberBox.width*1.8,'Nome deve ocupar a largura inteira da identificação');
  for(const size of [{width:1366,height:768},{width:1280,height:720}]){
   await page.setViewportSize(size);assert.ok(await modal.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Editor deve caber sem rolagem em '+size.width+'x'+size.height);
   const bounds=await modal.boundingBox();assert.ok(bounds.height<size.height&&bounds.width>bounds.height);
  }
  await page.setViewportSize({width:1366,height:768});await page.getByLabel('Observações',{exact:true}).fill((first.obs||'')+' · revisão de teste');
  await page.getByRole('button',{name:'Salvar ferramenta'}).click();await saved();const edited=await load();
  assert.deepEqual(edited.tools[0],{...first,obs:(first.obs||'')+' · revisão de teste'});assert.deepEqual(edited.drawings,before.drawings);assert.deepEqual(edited.cadDrafts,before.cadDrafts);
  await page.getByRole('button',{name:'+ Nova ferramenta',exact:true}).click();await page.getByLabel('Tipo',{exact:true}).selectOption('rosca');
  await page.getByLabel('Nome',{exact:true}).fill('Suporte de rosca interna · teste');await page.getByLabel('Limite / RPM fixo').fill('600');
  await page.getByLabel('Orientação da ferramenta').selectOption('roscaint');await expect(modal.locator('svg')).toHaveAttribute('aria-label',/montagem no plano XZ/);
  await page.screenshot({path:'tests/ferramenta-rosca-interna.png'});
  await page.getByRole('button',{name:'Salvar ferramenta'}).click();await saved();await page.reload();await page.getByRole('button',{name:/Ferramentas$/}).first().click();
  const row=page.getByRole('row').filter({hasText:'Suporte de rosca interna · teste'});await row.getByRole('button',{name:'Editar',exact:true}).click();
  await expect(page.getByLabel('Orientação da ferramenta')).toHaveValue('roscaint');
  await page.setViewportSize({width:600,height:800});assert.ok(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Sem corte horizontal em tela pequena');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'+ Nova ferramenta',exact:true}).click();await page.getByLabel('Tipo',{exact:true}).selectOption('rosca');
  const externalName='Suporte de rosca externa · haste vertical · inserto triangular 60°';
  await page.getByLabel('Nome',{exact:true}).fill(externalName);await page.getByLabel('Limite / RPM fixo').fill('600');
  await expect(modal.locator('svg')).toHaveAttribute('aria-label',/montagem no plano XZ/);
  assert.ok(await modal.evaluate(el=>el.scrollHeight<=el.clientHeight+1),'Rosca externa deve caber sem rolagem em 1280x720');
  await page.screenshot({path:'tests/ferramenta-rosca-externa.png'});
  await page.getByRole('button',{name:'Salvar ferramenta'}).click();await saved();await page.reload();await page.getByRole('button',{name:/Ferramentas$/}).first().click();
  await page.getByRole('row').filter({hasText:externalName}).getByRole('button',{name:'Editar',exact:true}).click();await expect(page.getByLabel('Nome',{exact:true})).toHaveValue(externalName);await expect(page.getByLabel('Orientação da ferramenta')).toHaveValue('rosca');await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.setViewportSize({width:1366,height:768});await page.getByRole('button',{name:/Simulação$/}).click();
  await page.getByLabel('Programa para simular').fill('G21G90G40G99\nT9090(ROSCA INTERNA)\nG97S600M4\nG0X20Z2\nG76P020060Q100R0.05\nG76X22Z-20P1000Q200F2\nM30');
  await page.getByLabel('Geometria para T9090',{exact:true}).waitFor();const internalTool=(await load()).tools.find(t=>t.nome==='Suporte de rosca interna · teste');await page.getByLabel('Geometria para T9090',{exact:true}).selectOption(internalTool.id);await page.getByLabel('Orientação T9090',{exact:true}).selectOption('roscaint');await expect(page.locator('.tool-diagram svg')).toHaveAttribute('aria-label',/montagem no plano XZ/);
  assert.deepEqual(errors,[]);
  // Restaura somente o banco temporário criado pelo servidor de testes.
  await page.evaluate(async original=>{if(globalThis.desktop)await globalThis.desktop.saveWorkspace(original);else localStorage.setItem('cnc.react.workspace.v3',JSON.stringify(original))},before);
  await fs.writeFile('tests/machine-tools-result.json',JSON.stringify({machineSelection:true,unchangedGenerator:true,persistence:true,escapeFocus:true,noScrollAt:['1366x768','1280x720'],toolFieldsPreserved:true,internalThreadPreview:true,externalThreadPreview:true,wideName:true,longNamePreserved:true,responsive:true,errors},null,2));
  console.log('Máquina e ferramentas: persistência, geração preservada, grupos sem rolagem e rosca interna aprovados.');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
