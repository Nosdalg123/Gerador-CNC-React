const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../public/engine/core.js'),P=require('../public/engine/progsim.js'),S=require('../public/engine/sim.js'),Setup=require('../public/engine/toolsetup.js'),fixture=require('./fixtures/g71-user-3.1.30.json');
const roughText=fixture.text.slice(0,fixture.text.indexOf('\nt00\ng54',fixture.text.indexOf('n20')))+'\nM30';
const minimal='G21G90G40G99\nT0101\nG97S1000M4\nG0X51Z2\nG71U1.5R.5\nG71P10Q20U.8W.1F.35\nN10G0X20\nG1Z0\nZ-50\nN20X51\nM30';
function build(text=roughText,tool=fixture.tool,bruto={}){const result=P.interpretar(text,{maq:C.DEFAULT_MAQ}),scene=P.montarCena(result,{d:51,sobre:0,livre:100,grip:25,...bruto,ferr:{'0101':{tool},'0000':{tool},'0301':{tool:{tipo:'rosca',rpm:1000}}}});return {result,scene,sim:new S.Sim(scene)};}
test('programa do usuário: camadas de até 1,5 mm no raio e contorno separado, sem passe tangente vazio nem execução implícita P/Q',()=>{
 const {result,sim}=build(),cycle=result.moves.filter(m=>m.line===10),rough=cycle.filter(m=>m.label==='DESBASTE G71');assert.deepEqual(result.erros,[]);assert.equal(new Set(rough.map(m=>m.pass)).size,16);assert.equal(sim.groups.filter(g=>g.line===10).length,17);
 assert.equal(result.moves.filter(m=>m.tool==='0101'&&m.line>=11&&m.line<=21).length,0,'Os N10..N20 são definição e não um acabamento implícito');
 const xs=[...new Map(rough.filter(m=>m.t==='f'&&m.z<0).map(m=>[m.pass,m.x])).values()];for(let i=1;i<xs.length;i++)assert.ok((xs[i-1]-xs[i])/2<=1.500001);assert.ok(cycle.every(m=>m.cutContext.depth===1.5&&m.cutContext.axis==='r'));assert.ok(cycle.every(m=>m.passes===17));
});
test('avançar um bloco executa somente uma camada do G71, mantendo material dos passes seguintes',()=>{
 const {sim}=build(minimal,{...fixture.tool,raio:0,larguraInserto:2,espessuraHaste:2}),groups=sim.groups.filter(g=>g.line===5);assert.ok(groups.length>3);sim.seek(groups[0].t1);const first=sim.mat.slice(),cell=(z,r)=>sim.mat[Math.floor((r-sim.rlo)/sim.cs)*sim.nz+Math.floor((z-sim.zlo)/sim.cs)];assert.equal(cell(-10,24.75),0);assert.equal(cell(-10,20.25),1);sim.seek(groups.at(-1).t1);assert.equal(cell(-10,20.25),0);assert.equal(cell(-10,10.25),1,'Sobremetal U.8 continua no raio');assert.notDeepEqual(sim.mat,first);
});
test('bolsão dos dois arcos é desbastado em vários níveis antes do contorno',()=>{
 const {result}=build(),pocket=new Set(result.moves.filter(m=>m.t==='f'&&m.label==='DESBASTE G71'&&m.z<-60&&m.x<40).map(m=>m.pass));assert.ok(pocket.size>=4,[...pocket]);
 const cycle=result.moves.filter(m=>m.line===10);assert.ok(cycle.filter(m=>m.t==='r'&&m.x===51).length>pocket.size,'Transferências entre bolsões passam pelo diâmetro de aproximação');
});
test('a ferramenta da foto com incrementos vazios acusa excesso usando U1.5 do programa e aponta a célula real',()=>{
 const before=structuredClone(fixture.tool),{sim}=build(),a=sim.analyze(),excess=a.alerts.find(a=>a.type==='incremento'&&a.line===10);assert.ok(excess,JSON.stringify(a.alerts));assert.match(excess.text,/no raio de 1.5 mm \(G71\)/);assert.ok(excess.contact&&Number.isFinite(excess.contact.z)&&Number.isFinite(excess.contact.x));assert.ok(a.alerts.some(a=>a.type==='inserto'&&a.line===10));assert.deepEqual(fixture.tool,before);
});
test('limite do banco mais restritivo vence; sem banco o ciclo continua limitando',()=>{
 const strict=build(roughText,{...fixture.tool,incTorn:.3,incFace:8}).sim.analyze();assert.ok(strict.alerts.some(a=>a.type==='incremento'&&/0.3 mm \(banco\)/.test(a.text)));
 const loose=build(roughText,{...fixture.tool,incTorn:10}).sim.analyze();assert.ok(loose.alerts.some(a=>a.type==='incremento'&&/1.5 mm \(G71\)/.test(a.text)));
});
test('haste é verificada no bruto restante e em G0 mesmo quando a ponta está fora da peça',()=>{
 const tool=C.simTool(fixture.tool,'rombo'),scene={maq:C.DEFAULT_MAQ,bruto:{d:51,z0:0,z1:-40},start:{x:20,z:12},tools:{a:tool},path:[{t:'r',x:20,z:-30,tool:'a',line:1}],semPerfil:true},sim=new S.Sim(scene),a=sim.analyze(),hit=a.alerts.find(a=>a.type==='haste'&&a.contact);assert.ok(hit,JSON.stringify(a.alerts));const dz=hit.contact.z-hit.z,dr=(hit.contact.x-hit.x)/2;assert.ok(S.inPoly(S.simulationToolParts(tool).hold,dz,dr));assert.ok(!S.inPoly(S.toolShape(tool).pts,dz,dr),'Contato da haste é separado da área ocupada pelo inserto');
 const snapshot=sim.mat.slice();sim.seek(sim.total);assert.deepEqual(sim.mat,snapshot,'G0 não remove material');
});
test('G70 só é executado quando chamado e reproduz C1.5 e C.5 em mm reais, não em diâmetro',()=>{
 const {result}=build(fixture.text),finish=result.moves.filter(m=>m.tool==='0000'&&m.t==='f');assert.ok(finish.some(m=>m.x===17&&m.z===0&&m.label==='ENTRADA DO CHANFRO C'));assert.ok(finish.some(m=>m.x===20&&m.z===-1.5&&m.label==='CHANFRO C1.5'));assert.ok(finish.some(m=>m.x===39&&m.z===-55));assert.ok(finish.some(m=>m.x===40&&m.z===-55.5));assert.ok(!build().result.moves.some(m=>m.label==='RETORNO (G70)'));
});
test('G71 tipo II explícito reconhece W0; sem ativação emite aviso sem reescrever o texto',()=>{
 const explicit=build(roughText.replace('n10g0x0','n10g0x0w0')).result;assert.ok(explicit.avisos.some(a=>a.cod==='g71ii'));assert.ok(!explicit.avisos.some(a=>a.cod==='g71cav'));const r=build().result;assert.ok(r.avisos.some(a=>a.cod==='g71cav'));assert.ok(r.avisos.some(a=>a.cod==='g71Recuo'));assert.equal(r.texto,roughText);
});
test('não inventa profundidade e recusa um ciclo maior que o orçamento de níveis',()=>{
 for(const text of [minimal.replace('G71U1.5R.5\n',''),minimal.replace('G71U1.5R.5','G71R.5'),minimal.replace('G71U1.5R.5','G71U0R.5')]){const r=P.interpretar(text);assert.ok(r.erros.length);assert.ok(!r.moves.some(m=>m.label==='DESBASTE G71'));}
 const tiny=P.interpretar(minimal.replace('G71U1.5R.5','G71U.000001R.5'));assert.ok(tiny.truncado);assert.ok(tiny.erros.length);
 const single=P.interpretar(minimal.replace('G71U1.5R.5\n','').replace('G71P10','G71D1.5P10'));assert.deepEqual(single.erros,[]);assert.ok(single.moves.filter(m=>m.label==='DESBASTE G71').every(m=>m.cutContext.depth===1.5));
});
test('G72 também pula as definições P/Q, conserva W no contexto e separa passes',()=>{
 const r=P.interpretar('T0101\nG97S1000M4\nG0X62Z1\nG72W2R.5\nG72P1Q2U.8W.1F.2\nN1G0Z-10\nN2G1X20\nM30');assert.deepEqual(r.erros,[]);assert.ok(r.moves.filter(m=>m.line===4).every(m=>m.cutContext.axis==='z'&&m.cutContext.depth===2));assert.ok(!r.moves.some(m=>m.line===5||m.line===6));assert.ok(new Set(r.moves.filter(m=>m.line===4).map(m=>m.pass)).size>2);
});
test('T0000 em corte exige associação explícita; o worker nunca escolhe por conveniência',()=>{
 assert.equal(Setup.programTool({},[fixture.tool],{codigo:'0000',sug:{tipo:'externa'}}),undefined);assert.equal(Setup.programTool({ferr:{'0000':'foto'}},[fixture.tool],{codigo:'0000'}).id,'foto');
 const root=path.resolve(__dirname,'../public/engine'),messages=[],context=vm.createContext({postMessage:m=>messages.push(m),structuredClone});context.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));vm.runInContext(fs.readFileSync(path.join(root,'simulation-worker.js'),'utf8'),context);
 const input={text:fixture.text,variables:'{}',maq:C.DEFAULT_MAQ,tools:[fixture.tool,{id:'thread',tipo:'rosca'}],state:{ferr:{'0101':'foto','0301':'thread'},b:{d:51,sobre:0,livre:100}}};context.onmessage({data:{kind:'program',input}});assert.ok(messages.at(-1).toolMissing.some(f=>f.code==='0000'));assert.equal(messages.at(-1).scene,null);input.state.ferr['0000']='foto';context.onmessage({data:{kind:'program',input}});const res=messages.at(-1);assert.ok(res.scene);context.onmessage({data:{kind:'simulation',input:{scene:res.scene}}});assert.ok(messages.at(-1).analysis.alerts.some(a=>a.type==='incremento'&&a.line===10));
});
