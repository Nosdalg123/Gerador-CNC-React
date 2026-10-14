const {chromium,_electron,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
async function main(){
 const desktop=process.argv.includes('--desktop');let browser;
 try{
  browser=desktop?await _electron.launch({executablePath:path.resolve('release/3.1.1/CNC-Torno-win32-x64/CNC-Torno.exe'),args:['--ui-test'],timeout:20000}):await chromium.launch({channel:process.env.CNC_TEST_BROWSER||'chrome',headless:true});
  const page=desktop?await browser.firstWindow():await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message)});
  if(!desktop)await page.goto(process.env.CNC_TEST_URL||'http://127.0.0.1:5175');
  await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByLabel('Geometria').waitFor();
  const types=await page.getByLabel('Geometria').locator('option').evaluateAll(nodes=>nodes.map(n=>n.value));
  for(const type of types){await page.getByLabel('Geometria').selectOption(type);await expect(page.getByLabel('Código CNC gerado')).not.toHaveValue('');await expect(page.locator('.piece-preview svg')).toBeVisible()}
  await page.getByLabel('Geometria').selectOption('espina');assert.equal(await page.locator('.dimensioned-field input:not([readonly])').count(),6);
  await page.getByLabel('C - Comprimento do encaixe',{exact:true}).fill('11');await page.getByLabel('D - Comprimento do corpo',{exact:true}).fill('61');await expect(page.getByLabel('G (calculado)')).toHaveValue('72');
  await page.getByLabel('Faceamento · desbaste',{exact:true}).fill('0');await expect(page.getByLabel('Faceamento · desbaste',{exact:true})).toHaveValue('0');await page.getByRole('button',{name:'Usar incrementos do banco'}).click();
  await page.getByLabel('C - Comprimento do encaixe',{exact:true}).fill('10.1');await page.getByLabel('D - Comprimento do corpo',{exact:true}).fill('60');
  assert.notEqual(await page.locator('.pv-bruto').evaluate(n=>getComputedStyle(n).fill),'rgb(0, 0, 0)');if(!desktop)await page.evaluate(()=>window.scrollTo(0,0));if(!desktop)await page.locator('.dimensioned-figure').screenshot({path:'tests/espina-restaurada.png'});
  await page.getByLabel('Geometria').selectOption('porta_matriz');assert.equal(await page.locator('.dimensioned-field input:not([readonly])').count(),12);await expect(page.getByLabel('Código CNC gerado')).not.toHaveValue('');
  const coordinates=await page.locator('.dimensioned-field').evaluateAll(nodes=>nodes.map(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return {inside:a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1}}));assert.ok(coordinates.every(c=>c.inside));
  if(!desktop)await page.evaluate(()=>window.scrollTo(0,0));if(!desktop)await page.locator('.dimensioned-figure').screenshot({path:'tests/porta-matriz-restaurado.png'});
  await page.getByRole('button',{name:'Simulador',exact:true}).click();await page.getByRole('button',{name:'Bloco →',exact:true}).click();await expect(page.locator('.sim-canvas')).toBeVisible();
  await page.getByRole('button',{name:/Ferramentas$/}).first().click();await page.getByRole('button',{name:'+ Nova ferramenta',exact:true}).click();await page.getByLabel('Tipo').selectOption('furacao');await expect(page.getByLabel('Giro')).toHaveValue('3');await expect(page.locator('.tool-diagram svg')).toBeVisible();await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:/Simulação$/}).click();await page.getByRole('button',{name:'Exemplo',exact:true}).click();await page.getByLabel('Geometria para T0101',{exact:true}).waitFor();await page.getByLabel('Geometria para T0101',{exact:true}).selectOption('');await expect(page.locator('.tool-diagram')).toContainText('Geometria não associada');await expect(page.locator('.tool-diagram svg')).toHaveCount(0);await expect(page.locator('.sim-canvas')).toHaveCount(0);
  const profile=await page.evaluate(()=>globalThis.desktop?.dataPath());
  assert.deepEqual(errors,[]);await fs.writeFile(`tests/parity-${desktop?'desktop':'light'}-result.json`,JSON.stringify({types,cotasEspina:6,cotasPortaMatriz:12,derivedG:72,zero:true,profile,errors},null,2));console.log('Paridade: sete geradores, 18 cotas, cálculo G, zero e simulação aprovados. Perfil '+profile);
 }finally{if(browser)await browser.close()}
}main().catch(e=>{console.error(e);process.exitCode=1});
