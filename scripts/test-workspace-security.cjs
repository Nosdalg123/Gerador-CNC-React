const {spawn}=require('node:child_process'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {workspaceClient}=require('./workspace-test-client.cjs');
async function main(){
 const server=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.resolve('release/CNC-Torno-Leve/Servidor-CNC.ps1'),'-UiTest','-NoBrowser'],{windowsHide:true});let output='',errors='';
 try{
  const url=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{server.kill();reject(Error('Servidor nao iniciou: '+errors))},20000);server.stdout.on('data',b=>{output+=b;const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[a-f0-9]+/);if(m){clearTimeout(timer);resolve(m[0])}});server.stderr.on('data',b=>errors+=b);server.once('error',reject);server.once('exit',code=>{clearTimeout(timer);if(!output)reject(Error('Servidor terminou '+code+': '+errors))})});
  const base=new URL(url),headers={'X-CNC-Token':base.searchParams.get('token'),'Content-Type':'application/json'},unauthorized=(route,data)=>fetch(base.origin+'/api/'+route,{method:data===undefined?'GET':'POST',headers,...(data===undefined?{}:{body:JSON.stringify(data)})});
  assert.equal((await unauthorized('load')).status,401);assert.equal((await unauthorized('save',{format:'cnc-workspace',tools:[],drawings:[]})).status,401);
  const admin=await workspaceClient(url),first=await admin.load();assert.ok(first.tools.length&&first.drawings.length);const profile=await admin.call('path'),before=await fs.readFile(path.join(profile,'workspace.json'),'utf8');
  assert.equal((await admin.raw('save',first,{'If-Match':''})).status,409);assert.equal(await fs.readFile(path.join(profile,'workspace.json'),'utf8'),before);
  const other=await workspaceClient(url),old=await other.load(),changed=structuredClone(first);changed.tools[0].nome='EDICAO A PRESERVAR';await admin.save(changed);old.theme=old.theme==='light'?'dark':'light';assert.equal((await other.raw('save',old)).status,409);assert.equal((await admin.load()).tools[0].nome,'EDICAO A PRESERVAR');
  const previous=JSON.parse(await fs.readFile(path.join(profile,'workspace.json.previous'),'utf8'));assert.equal(previous.tools[0].nome,first.tools[0].nome);
  const fresh=await other.load();fresh.theme='dark';await other.save(fresh);assert.equal((await admin.load()).tools[0].nome,'EDICAO A PRESERVAR');
  await admin.call('access/save',{username:'somente-sim',password:'teste123',views:['sim'],limitSeconds:null,create:true});const sim=await workspaceClient(url,{username:'somente-sim',password:'teste123'}),simData=await sim.load();simData.program.texto='M30';await sim.save(simData);
  const forbidden=structuredClone(simData);forbidden.tools[0].nome='NAO PERMITIDO';assert.equal((await sim.raw('save',forbidden)).status,403);assert.equal((await sim.load()).tools[0].nome,'EDICAO A PRESERVAR');
  const machine=await sim.load();machine.form.maq.xMax=9999;assert.equal((await sim.raw('save',machine)).status,403);const command=await sim.load();command.form.maq.comando='siemens';await sim.save(command);
  const config=await sim.load();config.form.dataManual='OUT/2026';assert.equal((await sim.raw('save',config)).status,403);
  for(const [module,key,value] of [['ferr','tools',null],['desenho','drawings',[]],['cad','cadDrafts',[{id:'draft',nome:'Teste'}]],['cfg','form',null]]){
   await admin.call('access/save',{username:'mod-'+module,password:'teste123',views:[module],limitSeconds:null,create:true});const client=await workspaceClient(url,{username:'mod-'+module,password:'teste123'}),data=await client.load();
   if(module==='ferr')data.tools[0].obs='Permitido no cadastro';else if(module==='cfg')data.form.maq.xMax=450;else data[key]=value;await client.save(data);
   const denied=await client.load();denied.program={...denied.program,texto:'M99'};assert.equal((await client.raw('save',denied)).status,403);
  }
  await admin.call('access/save',{username:'prazo',password:'teste123',views:['sim'],limitSeconds:60,create:true});const limited=await workspaceClient(url,{username:'prazo',password:'teste123'}),limitedData=await limited.load();await admin.call('access/save',{username:'prazo',views:['sim'],limitSeconds:.001,create:false});await new Promise(r=>setTimeout(r,30));assert.equal((await limited.raw('load')).status,403);assert.equal((await limited.raw('save',limitedData)).status,401);
  await sim.call('access/logout',{});assert.equal((await sim.raw('load')).status,401);
  const current=await admin.load(),disk=JSON.parse(await fs.readFile(path.join(profile,'workspace.json'),'utf8'));disk.externalMarker='PRESERVAR';await fs.writeFile(path.join(profile,'workspace.json'),JSON.stringify(disk));assert.equal((await admin.raw('save',current)).status,409);assert.equal(JSON.parse(await fs.readFile(path.join(profile,'workspace.json'),'utf8')).externalMarker,'PRESERVAR');
  await fs.writeFile('tests/workspace-security-result.json',JSON.stringify({authentication:true,quota:true,logout:true,fieldPermissions:true,trustedInitialization:true,clientRevisionRequired:true,staleWriteRejected:true,previousPreserved:true,reloadAllowsSave:true,externalChangePreserved:true},null,2));
  console.log('Workspace: login, permissões por campo, cota, logout, inicialização, conflito entre clientes e preservação de dados aprovados.');
 }finally{server.kill()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
