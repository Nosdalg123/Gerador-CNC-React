const {chromium,expect}=require('@playwright/test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
async function main(){
 const root=path.resolve('dist'),server=http.createServer((req,res)=>{const name=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,name==='/'?'index.html':name);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.wasm':'application/wasm'};try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1500,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const metrics={};
 try{
  await page.goto('http://127.0.0.1:'+server.address().port);await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByLabel('Geometria',{exact:true}).waitFor();
  const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc.react.workspace.v3')));
  const first=before.tools[0];await page.getByRole('button',{name:/Ferramentas$/}).first().click();await page.getByRole('button',{name:'Editar',exact:true}).first().click();await expect(page.getByLabel('Número T',{exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.getByRole('button',{name:/Simulação$/}).click();
  const code='G21G90G40G99\nT0909(DESBASTE)\nG97S1000M3\nG0X70Z5\nG42G0X30Z5\nG1Z0F.2\nX50Z-10\nZ-30\nG40G0X80Z5\nM30';
  await page.getByLabel('Programa para simular').fill(code);await page.getByLabel('Geometria para T0909').waitFor();await expect(page.getByText('Posição 09',{exact:true})).toBeVisible();await expect(page.getByText('Corretor 09',{exact:true})).toBeVisible();
  await page.getByLabel('Geometria para T0909').selectOption(first.id);await page.getByLabel('Raio do corretor T0909 · mm',{exact:true}).fill('0.8');await page.getByLabel('Ponta do corretor T0909').selectOption('3');
  await expect(page.locator('.simulation')).toBeVisible({timeout:30000});await expect(page.locator('.message.warning').filter({hasText:/diferente de T/})).toHaveCount(0);
  await page.getByRole('checkbox',{name:/Comparar trajetória programada/}).check();await page.locator('.sim-canvas').screenshot({path:'tests/compensacao-comparacao.png'});
  const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('cnc.react.workspace.v3')));assert.deepEqual(after.tools,before.tools);assert.deepEqual(after.drawings,before.drawings);
  const long='G21G90G40G99\nT0909\nG97S1000M3\nG0X70Z5\nG1X62Z0F.2\n'+Array.from({length:16000},(_,i)=>i%2?'G1Z0':'G1Z-60').join('\n')+'\nM30';
  await page.evaluate(()=>{window.heartbeat={last:performance.now(),max:0,count:0};window.heartbeatTimer=setInterval(()=>{const n=performance.now();heartbeat.max=Math.max(heartbeat.max,n-heartbeat.last);heartbeat.last=n;heartbeat.count++;},25);});
  console.log('Compensação e associação conferidas; preparando colagem de 16000 movimentos.');
  await page.getByLabel('Programa para simular').evaluate((el,text)=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,text);el.dispatchEvent(new Event('input',{bubbles:true}));},long);await page.waitForTimeout(700);
  const start=Date.now();await page.getByRole('button',{name:/Ferramentas$/}).first().click();metrics.switchMs=Date.now()-start;assert.ok(metrics.switchMs<1500,'Navegação deve continuar disponível durante análise');
  await expect(page.getByRole('heading',{name:'Ferramentas',exact:true})).toBeVisible();
  metrics.heartbeat=await page.evaluate(()=>{clearInterval(heartbeatTimer);return heartbeat;});assert.ok(metrics.heartbeat.count>5);assert.ok(metrics.heartbeat.max<1000,'Processamento não deve bloquear a interface por segundos');
  await page.getByRole('button',{name:/Simulação$/}).click();await page.getByRole('button',{name:'Exemplo',exact:true}).click();await expect(page.locator('.simulation')).toBeVisible({timeout:30000});
  assert.equal(await page.getByLabel('Programa para simular').inputValue(),'G21G90G40G99\nG28U0\nG0Z250\nT0101\nG97S1000M4\nG0X62Z2\nG1Z0F.2\nX-1\nG0X65Z3\nG28U0\nM9\nM30');
  await expect(page.getByLabel('Geometria para T0101')).toBeVisible();await expect(page.getByLabel('Geometria para T0909')).toHaveCount(0);
  await page.getByRole('button',{name:/Gerador$/}).click();await page.getByLabel('Geometria',{exact:true}).selectOption('matriz_solida');await page.locator('.generator-tool').first().getByLabel(/^Posição ·/).fill('9');await page.locator('.generator-tool').first().getByLabel(/^Corretor ·/).fill('12');
  assert.match(await page.getByLabel('Código CNC gerado').inputValue(),/#101=0912/);
  assert.deepEqual(errors,[]);metrics.errors=errors;metrics.independentToolMapping=true;metrics.staleAnalysisCancelled=true;
  fs.writeFileSync('tests/simulation-corrections-ui-result.json',JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
 }catch(e){console.log('Erros da página:',JSON.stringify(errors));await page.screenshot({path:'tests/simulation-corrections-failure-latest.png',fullPage:true}).catch(()=>{});throw Error(String(e.message).split('\n')[0]);}finally{await browser.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
