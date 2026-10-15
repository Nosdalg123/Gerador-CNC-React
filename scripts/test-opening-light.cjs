const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {chromium}=require('@playwright/test');
const release=path.resolve('release/CNC-Torno-Leve'),children=[];
function start(script,profile,args=[]){
 const proc=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script,'-UiTest','-NoBrowser',...(profile?['-TestProfile',profile]:[]),...args],{windowsHide:true});children.push(proc);let out='',err='';
 const ready=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{proc.kill();reject(Error('Servidor nao iniciou: '+err))},20000);proc.stdout.on('data',b=>{out+=b;const m=out.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]+/);if(m){clearTimeout(timer);resolve(m[0])}});proc.stderr.on('data',b=>err+=b);proc.once('error',e=>{clearTimeout(timer);reject(e)});proc.once('exit',code=>{clearTimeout(timer);if(!out)reject(Error('Servidor terminou '+code+': '+err))})});return {proc,ready};
}
function api(url,route,data){const u=new URL(url);return fetch(u.origin+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{'X-CNC-Token':u.searchParams.get('token'),'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})})}
async function main(){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'cnc-react-light-test-releases-')),profile=path.join(base,'cnc-react-light-test-profile');await fs.mkdir(profile);
 const server=await fs.readFile(path.join(release,'Servidor-CNC.ps1'),'utf8'),built=JSON.parse(await fs.readFile(path.join(release,'app/BUILD-REVISION.json'),'utf8'));
 async function fixture(name,version,digest,legacy=false){const dir=path.join(base,name);await fs.mkdir(path.join(dir,'app'),{recursive:true});await fs.writeFile(path.join(dir,'app/index.html'),'<html><head><title>Gerador CNC · 3.1.24</title></head></html>');await fs.writeFile(path.join(dir,'app/BUILD-REVISION.json'),JSON.stringify({version,sourceDigest:digest.repeat(64)}));await fs.writeFile(path.join(dir,'Servidor-CNC.ps1'),legacy?server.replace("'/api/revision' {$body=ConvertTo-Json -InputObject $revision -Compress}",''):server);await fs.copyFile(path.join(release,'Usuarios-CNC.ps1'),path.join(dir,'Usuarios-CNC.ps1'));return path.join(dir,'Servidor-CNC.ps1')}
 const old=await fixture('anterior','3.1.25','a',true),latest=await fixture('atual',built.version,'b'),mirror=await fixture('mesma-versao-outra-pasta',built.version,'c'),lower=await fixture('versao-3.1.16','3.1.16','d');
 let url=await start(old,profile).ready;
 const workspace={format:'cnc-workspace',tools:[{id:'preservar',nome:'Banco de teste'}],drawings:[],program:{texto:'M30'}};
 await api(url,'save',{...workspace,program:{texto:'M00'}});assert.equal((await api(url,'save',workspace)).status,200);
 const preserved={};for(const name of ['workspace.json','workspace.json.previous','users.json'])preserved[name]=await fs.readFile(path.join(profile,name));
 async function checkData(next){assert.deepEqual(await (await api(next,'load')).json(),workspace);for(const [name,bytes] of Object.entries(preserved))assert.deepEqual(await fs.readFile(path.join(profile,name)),bytes,name+' alterado');}
 async function switchTo(script,label){const prev=url;url=await start(script,profile).ready;assert.notEqual(new URL(url).origin,new URL(prev).origin,label);await checkData(url);await assert.rejects(fetch(new URL(prev).origin+'/api/alive'),undefined,'Servidor anterior continua ativo');}
 try{
  await switchTo(latest,'Servidor sem identidade e titulo antigo');
  const reuse=start(latest,profile);assert.equal(await reuse.ready,url,'Mesma pasta e revisao devem reutilizar a sessao');
  const beforeManual=url;url=await start(latest,profile,['-RestartExisting']).ready;assert.notEqual(url,beforeManual);await checkData(url);
  assert.equal((await (await api(url,'revision')).json()).sourceDigest,'b'.repeat(64));
  await fs.writeFile(path.join(path.dirname(latest),'app/BUILD-REVISION.json'),JSON.stringify({version:built.version,sourceDigest:'c'.repeat(64)}));
  assert.equal((await (await api(url,'revision')).json()).sourceDigest,'b'.repeat(64),'Identidade deve ser do build carregado');
  await switchTo(latest,'Mesma versao e pasta com build diferente');
  await switchTo(mirror,'Mesmo build em outra pasta');
  assert.equal((await (await api(url,'revision')).json()).appRoot,path.join(path.dirname(mirror),'app'));
  await fs.appendFile(mirror,'\n# Atualizacao do servidor com o mesmo build de interface.\n');
  await switchTo(mirror,'Servidor alterado na mesma pasta');
  await switchTo(lower,'Abrir versao anterior deve respeitar a pasta escolhida');assert.equal((await (await api(url,'revision')).json()).version,'3.1.16');
  await switchTo(path.join(release,'Servidor-CNC.ps1'),'Retorno para a distribuicao atual');
  const actual=await (await api(url,'revision')).json();assert.equal(actual.version,built.version);assert.equal(actual.sourceDigest,built.sourceDigest);assert.equal((await fetch(new URL(url).origin+'/api/revision')).status,400);
  const uiUrl=await start(path.join(release,'Servidor-CNC.ps1')).ready;
  const browser=await chromium.launch({channel:'msedge',headless:true});try{const page=await browser.newPage({viewport:{width:1366,height:768}});await page.goto(uiUrl);assert.equal(await page.title(),'Gerador CNC · '+built.version);await page.getByText('Versão '+built.version,{exact:true}).waitFor();await page.getByLabel('Senha',{exact:true}).fill('admin');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByRole('button',{name:/Ferramentas$/}).first().click();await page.getByRole('button',{name:'+ Nova ferramenta',exact:true}).click();await page.getByLabel('Número padrão no programa · T',{exact:true}).waitFor();await page.getByLabel('Orientação do suporte',{exact:true}).selectOption('vertical');await page.getByLabel('Posição do inserto no suporte',{exact:true}).selectOption('esquerda');await page.getByRole('dialog',{name:'Cadastro de ferramenta'}).screenshot({path:'tests/abertura-correta-3.1.27.png'});}finally{await browser.close()}
  console.log('Abertura aprovada: servidor antigo, build diferente, pasta diferente, downgrade, reabertura, titulo e melhorias visiveis; workspace, .previous e usuarios preservados.');
 }finally{for(const child of children)child.kill()}
}
main().catch(e=>{for(const child of children)child.kill();console.error(e);process.exitCode=1});
