const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../public/engine/core.js'),P=require('../public/engine/progsim.js'),Setup=require('../public/engine/toolsetup.js');globalThis.CNC=C;
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../public/engine/seed.js'),'utf8'),context);const bank=JSON.parse(JSON.stringify(context.window.CNC_SEED_TOOLS)).map((t,i)=>({...t,id:'seed-'+i}));
test('data manual permanece em comentario CNC mesmo com parenteses e controles importados',async()=>{
 const {generate}=await import('../src/domain.mjs');
 for(const dataManual of ['OUT/2026)G0X0Z0(','OUT/2026)\nM99\r(','[OUT] (2026)','OUT/2026']){
  const result=generate({tipo:'matriz_solida',dataManual},[],bank);assert.deepEqual(result.erros,[]);const header=result.code.split('\n')[3];assert.equal(P.prepara(header).blocos[0].kind,'vazio');assert.equal(header.split('\n').length,1);assert.equal(header,'(FERRAMENTARIA - '+C.ascii(dataManual)+')');
 }
});
test('gerador bloqueia estacao compartilhada por ferramentas incompatíveis, com corretor igual ou diferente',async()=>{
 const {generate}=await import('../src/domain.mjs');
 for(const [a,b] of [['0404','0404'],['0404','0412'],['0202','']]){
  const tools=bank.map(t=>({...t,tPadrao:t.tipo==='externa'?a:t.tipo==='encaixe'?b:''})),result=generate({tipo:'matriz_tubular'},[],tools);assert.ok(result.erros.some(e=>e.includes('torre usada por geometrias diferentes')));assert.equal(result.code,undefined);assert.equal(result.cena,undefined);
 }
 const good=generate({tipo:'matriz_tubular'},[],bank.map(t=>({...t,tPadrao:t.tipo==='externa'?'0404':t.tipo==='encaixe'?'0505':''})));assert.deepEqual(good.erros,[]);assert.match(good.code,/#101=0404/);assert.match(good.code,/#102=0505/);
 const geometry={tipo:'externa',raio:.8,angulo:80,t:'0404'};assert.deepEqual(Setup.validateMountings([{tool:{...geometry,id:'a',vc:200},label:'Desbaste'},{tool:{...geometry,id:'b',vc:300,t:'0412'},label:'Acabamento'}]),[]);
 assert.equal(Setup.validateMountings([{tool:geometry,label:'A'},{tool:{...geometry,raio:1.2},label:'B'}]).length,1);
});
test('backup remapeia a geometria do programa e separa IDs de ferramenta e desenho',async()=>{
 const {mergeWorkspace}=await import('../src/data.mjs'),drawing={id:'same',nome:'Atual',lados:'1',trechos1:[],trechos2:[],internos1:[],internos2:[]};
 const current={format:'cnc-workspace',tools:[{id:'same',nome:'Externa',tipo:'externa'}],drawings:[drawing],work:drawing,form:{desenhoSel:'same',toolByTipo:{matriz_solida:{t1:'same'}}},program:{texto:'T0101',ferr:{'0101':'same'}}};
 const incoming={tools:[{id:'same',nome:'Interna',tipo:'interna'}],drawings:[{...drawing,nome:'Importado'}],work:{...drawing,nome:'Importado'},form:{desenhoSel:'same',toolByTipo:{matriz_solida:{t1:'same'}}},program:{texto:'T0404',ferr:{'0404':'same'}}},before=structuredClone(current),original=structuredClone(incoming),next=mergeWorkspace(current,incoming,C),toolId=next.tools[1].id,drawingId=next.drawings[1].id;
 assert.notEqual(toolId,drawingId);assert.equal(next.program.ferr['0404'],toolId);assert.equal(Setup.programTool(next.program,next.tools,{codigo:'0404',sug:{tipo:'interna'}}).tipo,'interna');assert.equal(next.form.toolByTipo.matriz_solida.t1,toolId);assert.equal(next.form.desenhoSel,drawingId);assert.equal(next.work.id,drawingId);assert.deepEqual(current,before);assert.deepEqual(incoming,original);
 const partial=mergeWorkspace(current,{tools:incoming.tools,drawings:incoming.drawings,form:{nome:'Outro'}},C);assert.deepEqual(partial.program,current.program);assert.equal(partial.form.toolByTipo.matriz_solida.t1,'same');assert.equal(partial.form.desenhoSel,'same');assert.equal(partial.work.id,'same');
});
test('inicializacao depois do login nao inclui cadastro ou sessoes locais no backup',async()=>{
 const {initialWorkspace}=await import('../src/data.mjs'),values=new Map([['cnc.access.users.v1','credencial'],['cnc.access.sessions.v1','sessao'],['cnc.outro','preservar']]),storage={getItem:k=>values.get(k)||null,key:i=>[...values.keys()][i],length:values.size};const workspace=initialWorkspace(C,bank,storage);assert.deepEqual(workspace.legacyExtras,{'cnc.outro':'preservar'});
});
test('bridge autentica a leitura, serializa gravacoes e mantem conflito ate recarregar',async()=>{
 let tag='"0"',stored={value:0},active=0,maxActive=0,saves=0;const requests=[];
 const sandbox={setInterval:()=>{},fetch:async(route,options)=>{
  requests.push({route,headers:options.headers});
  if(route==='/api/access/login')return new Response(JSON.stringify({session:'user-session',user:{username:'admin'}}));
  if(route==='/api/alive')return new Response('true');
  if(options.headers['X-CNC-Session']!=='user-session')return new Response('Login necessario',{status:401});
  if(route==='/api/load')return new Response(JSON.stringify(stored),{headers:{ETag:tag}});
  if(options.headers['If-Match']!==tag)return new Response('Conflito',{status:409});
  active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,5));stored=JSON.parse(options.body);tag='"'+(++saves)+'"';active--;return new Response('true',{headers:{ETag:tag}});
 }};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../lightweight/bridge.js'),'utf8'),sandbox);const api=sandbox.desktop;
 await assert.rejects(api.loadWorkspace(),e=>e.status===401);await api.access('login',{username:'admin',password:'test'},'');await api.loadWorkspace();await Promise.all([api.saveWorkspace({value:1}),api.saveWorkspace({value:2})]);assert.equal(maxActive,1);assert.equal(stored.value,2);
 tag='"external"';await assert.rejects(api.saveWorkspace({value:3}),e=>e.status===409);const before=requests.length;await assert.rejects(api.saveWorkspace({value:4}),e=>e.status===409);assert.equal(requests.length,before);await api.loadWorkspace();await api.saveWorkspace({value:5});assert.equal(stored.value,5);
});
test('resposta atrasada da sessao anterior nao substitui o login atual na bridge',async()=>{
 let login=0,finishPulse,lastSession;const sandbox={setInterval:()=>{},fetch:async(route,options)=>{
  if(route==='/api/access/login')return new Response(JSON.stringify({session:'session-'+(++login)}));
  if(route==='/api/access/logout')return new Response('true');
  if(route==='/api/access/pulse')return new Promise(resolve=>{finishPulse=()=>resolve(new Response(JSON.stringify({user:{username:'anterior'}})))});
  lastSession=options.headers['X-CNC-Session'];return new Response('{}',{headers:{ETag:'"current"'}});
 }};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../lightweight/bridge.js'),'utf8'),sandbox);const api=sandbox.desktop;
 await api.access('login',{},'');const delayed=api.access('pulse',{},'session-1');await api.access('logout',{},'session-1');await api.access('login',{},'');finishPulse();await delayed;await api.loadWorkspace();assert.equal(lastSession,'session-2');
});
