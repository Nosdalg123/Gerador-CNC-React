const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
function command(args,env){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env:{...process.env,...env},windowsHide:true,stdio:'inherit'});p.on('error',reject);p.on('exit',code=>code===0?resolve():reject(Error(args.join(' ')+' terminou com '+code)))})}
async function hashes(dir,prefix=''){const out={};for(const item of await fs.readdir(dir,{withFileTypes:true})){const key=prefix+item.name,file=path.join(dir,item.name);if(item.isDirectory())Object.assign(out,await hashes(file,key+'/'));else out[key]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')}return out}
async function main(){await command(['scripts/test-workspace-security.cjs']);await command(['scripts/test-security-ui.cjs']);await command(['scripts/test-restart-light.cjs']);const server=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','release/CNC-Torno-Leve/Servidor-CNC.ps1','-UiTest','-NoBrowser'],{windowsHide:true});let output='';server.stderr.on('data',b=>process.stderr.write(b));
 try{
  const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Servidor não iniciou em 15 segundos')),15000);server.stdout.on('data',b=>{output+=b;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]+/);if(match){clearTimeout(timer);resolve(match[0])}});server.on('exit',c=>{clearTimeout(timer);reject(Error('Servidor terminou: '+c))});server.on('error',reject)});
  console.log('Servidor leve iniciado com dados temporários.');
  assert.deepEqual(await hashes('dist'),await hashes('release/CNC-Torno-Leve/app'));
  const base=new URL(url),token=base.searchParams.get('token');let apiClient;const call=async(route,data)=>{apiClient||=await require('./workspace-test-client.cjs').workspaceClient(url);return apiClient.raw(route,data)};
  assert.equal((await fetch(base.origin+'/api/load')).status,400);
  await command(['scripts/test-parity-ui.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});await command(['scripts/test-ui.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});await command(['scripts/test-cad.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-simulation-view.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-dxf-operations.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-cad-pointer.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-dxf-arc-connections.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-cad-half.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-disco-real.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-cad-stages.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-cad-dual.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});await command(['scripts/test-cad-machining-safety.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-piece-editor.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-machine-tools.cjs'],{CNC_TEST_URL:url,CNC_TEST_BROWSER:'msedge'});
  await command(['scripts/test-users.cjs']);
  const original=await (await call('load')).json();assert.ok(original.drawings.length&&original.tools.length);
  const saved={...original,testePreservacao:{nome:'Peça cotada · ação',zero:0,extras:[1,2,3]}};
  assert.equal((await call('save',saved)).status,200);assert.deepEqual(await (await call('load')).json(),saved);
  const profile=await (await call('path')).json();assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'workspace.json'),'utf8')),saved);assert.ok(await fs.stat(path.join(profile,'workspace.json.previous')));
  const reuse=await new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','release/CNC-Torno-Leve/Servidor-CNC.ps1','-UiTest','-NoBrowser','-TestProfile',profile],{windowsHide:true});let result='';child.stdout.on('data',b=>result+=b);child.stderr.on('data',b=>process.stderr.write(b));child.on('exit',c=>c===0?resolve(result.trim()):reject(Error('Reabertura falhou: '+c)))});assert.equal(reuse,url);
  assert.equal((await call('save',{format:'errado',tools:[],drawings:[]})).status,400);assert.deepEqual(await (await call('load')).json(),saved);
  // Simula outra sessão modificando o arquivo; nenhuma gravação pode apagá-la.
  const external={...saved,alteracaoExterna:'preservar'};await fs.writeFile(path.join(profile,'workspace.json'),JSON.stringify(external));assert.equal((await call('save',saved)).status,409);assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'workspace.json'),'utf8')),external);
  await fs.writeFile('tests/light-result.json',JSON.stringify({assetsIdentical:true,offlineAssets:true,pdf:true,cad:true,dxfGeometry:true,cleanImport:true,allGenerators:true,pieceEditor:true,coneFillets:true,persistence:true,unicode:true,previousBackup:true,invalidDataRejected:true,externalChangePreserved:true,profile},null,2));console.log('Versão leve: recursos idênticos, PDF, CAD, editor por elementos e preservação dos dados aprovados.');
 }finally{server.kill()}
}main().catch(e=>{console.error(e);process.exitCode=1});
