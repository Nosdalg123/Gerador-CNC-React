const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../public/engine/core.js'),S=require('../public/engine/sim.js'),P=require('../public/engine/progsim.js'),Setup=require('../public/engine/toolsetup.js');
globalThis.CNC=C;
const seed={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),seed);globalThis.CNC_SEED_TOOLS=JSON.parse(JSON.stringify(seed.window.CNC_SEED_TOOLS));
const groove=(more={})=>({tipo:'encaixe',largura:6,comprimentoInserto:18,...more});
const area=pts=>pts.reduce((sum,p,i)=>{const q=pts[(i+1)%pts.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2;

test('canal e bedame: raio parcial/total, três orientações e quatro montagens preservam largura, referência e convexidade',async()=>{
 const {simulationToolParts}=await import('../src/assets/tool-drawing.mjs');
 for(const tipo of ['encaixe','bedame'])for(const kind of ['canal','canalext','canalint'])for(const mount of ['inferior_esquerdo','inferior_direito','superior_esquerdo','superior_direito'])for(const perfilCorte of ['raio','total']){
  const tool=groove({tipo,orient:kind,posicaoInserto:mount,perfilCorte,raioCorte:.8,espessuraHaste:20}),copy=structuredClone(tool),shape=C.simTool(tool,kind),cut=S.toolShape(shape),sharp=S.toolShape(C.simTool({...tool,perfilCorte:'reto'},kind));
  assert.equal(shape.raioPerfil,perfilCorte==='total'?3:.8);assert.deepEqual(cut.bb.map(x=>x||0),sharp.bb.map(x=>x||0));assert.equal(cut.nose,null,'O raio do perfil não é um corretor de torneamento');assert.ok(area(cut.pts)>0);assert.ok(area(cut.pts)<area(sharp.pts));
  for(let i=0;i<cut.pts.length;i++)for(const p of cut.pts){const a=cut.pts[i],b=cut.pts[(i+1)%cut.pts.length];assert.ok((b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])>=-1e-8,'Polígono convexo para remoção física');}
  assert.deepEqual(simulationToolParts(shape).ins,cut.pts);assert.deepEqual(tool,copy);
 }
});

test('raio total acompanha a largura; dimensões inválidas bloqueiam sem alterar ferramentas antigas',async()=>{
 const {validateToolGeometry}=await import('../src/tool-geometry-fields.mjs');
 assert.equal(C.simTool(groove({perfilCorte:'total',largura:8}),'canalext').raioPerfil,4);
 assert.deepEqual(S.toolShape(C.simTool(groove(),'canalext')).pts,[[-6,0],[0,0],[0,18],[-6,18]]);
 for(const bad of [{perfilCorte:'raio',raioCorte:4},{perfilCorte:'raio',raioCorte:-1},{perfilCorte:'raio',raioCorte:''},{perfilCorte:'raio',raioCorte:'x'},{perfilCorte:'total',comprimentoInserto:2},{perfilCorte:'desconhecido'}]){
  assert.ok(validateToolGeometry(groove(bad)));assert.throws(()=>C.simTool(groove(bad),'canalext'),/raio do perfil/);
 }
 assert.equal(validateToolGeometry(groove({perfilCorte:'raio',raioCorte:3})), '');
});

test('perfil arredondado deixa material nas quinas e corta no centro na simulação física',()=>{
 function material(profile,z,r){const scene={bruto:{d:60,z0:0,z1:-30},chuck:{zFace:-25,zBack:-40,rOut:40},outline:[],semPerfil:true,maq:C.DEFAULT_MAQ,start:{x:70,z:-10},tools:{g:C.simTool(groove({perfilCorte:profile}),'canalext')},path:[{t:'f',x:40,z:-10,f:.2,line:0,tool:'g'}]},sim=new S.Sim(scene);sim.seek(sim.total);return sim.mat[Math.floor((r-sim.rlo)/sim.cs)*sim.nz+Math.floor((z-sim.zlo)/sim.cs)];}
 assert.equal(material('reto',-10.2,20.3),0);assert.equal(material('total',-10.2,20.3),1);assert.equal(material('total',-13,20.3),0);
});

test('bedame fica disponível em canais do Gerador, posições T e orientações do programa',async()=>{
 const tool=groove({id:'bed',tipo:'bedame',nome:'BEDAME',vc:150,rpm:1200,modo:'G96',avDesb:.1,avAcab:.1,incCanal:1,sentido:4,orient:'canalext',perfilCorte:'total'}),ref={codigo:'9912',sug:{tipo:'bedame'}};
 assert.equal(P.formaFerr(tool).kind,'canalext');assert.equal(Setup.programOrientation({},ref,tool),'canalext');assert.equal(Setup.composeCode('99','12'),'9912');
 for(const kind of ['canal','canalext','canalint']){const state={ferr:{'9912':'bed'},orient:{'9912':kind}};assert.equal(Setup.programOrientation(state,ref,tool),kind);assert.equal(P.formaFerr(Setup.programGeometry(state,[tool],ref),kind).raioPerfil,3);}
 for(const g of Object.values(C.GERADORES))for(const slot of g.ferramentas)if(slot.tipos.includes('encaixe'))assert.ok(slot.tipos.includes('bedame'));
 const {generate}=await import('../src/domain.mjs'),bank=CNC_SEED_TOOLS.filter(t=>t.tipo!=='encaixe').map((t,i)=>({...t,id:'s'+i})).concat(tool),result=generate({tipo:'matriz_tubular',toolByTipo:{matriz_tubular:{t2:'bed'}},toolSetupByTipo:{matriz_tubular:{t2:{position:'99',offset:'12'}}}},[],bank);
 assert.deepEqual(result.erros,[]);assert.ok(!result.avisos.some(s=>s.includes('bedame')));assert.ok(result.code.includes('9912'));assert.equal(tool.t,undefined);
 const parsed=P.interpretar('T9912(BEDAME)\nG97S1000M3\nG0X60Z-10\nG1X0F.1\nM30');assert.equal(parsed.ferramentas[0].sug.tipo,'bedame');
});

test('leitor e geração respeitam cinco níveis, contando SQRT; comentários não contam',()=>{
 assert.equal(C.conferirColchetes('#1=SQRT[[[[[4]]]]](IGNORAR [[[[[[)\nX[1]'),5);
 assert.deepEqual(P.interpretar('#1=SQRT[[[[[4]]]]]\nG0X#1Z0\nM30').erros,[]);
 for(const code of ['#1=SQRT[[[[[[4]]]]]]','#1=[2','#1=2]']){assert.throws(()=>C.conferirColchetes(code),/colchete/);const r=P.interpretar(code+'\nG1X0Z0F.2\nM30');assert.ok(r.erros.length);assert.equal(r.moves.length,0);assert.equal(r.truncado,true);}
 assert.ok(P.interpretar('GOTO10\n#1=[[[[[[2]]]]]]\nN10M30').erros.length,'Também confere blocos não executados');
});

test('cantos múltiplos externos e internos usam até dois níveis e continuam paramétricos',async()=>{
 const {drawingPreview}=await import('../src/domain.mjs'),d={id:'d',nome:'Cones e raios',lados:'1',lPeca:100,dRef:100,trechos1:[{id:'a',tipo:'cone',a:80,b:84,c:20},{id:'b',tipo:'cone',a:84,b:93,c:30},{id:'c',tipo:'cil',a:93,b:25},{id:'r1',tipo:'raio',a:1,alvo:'a',onde:'ini'},{id:'r2',tipo:'chanfro',a:.5,alvo:'a',onde:'fim'}],trechos2:[],internos1:[{id:'f',tipo:'furo',a:10,b:80},{id:'i',tipo:'icone',a:70,b:50,c:20},{id:'j',tipo:'icone',a:50,b:30,c:30},{id:'k',tipo:'icil',a:30,b:25},{id:'ri',tipo:'iraio',a:1,alvo:'i',onde:'ini'},{id:'rj',tipo:'iraio',a:.5,alvo:'j',onde:'fim'}],internos2:[]};
 const result=drawingPreview(d,[]);assert.deepEqual(result.erros,[]);assert.ok(C.conferirColchetes(result.code)<=2);assert.equal((result.code.match(/^#500=/gm)||[]).length,4);assert.ok(result.code.includes('#800='));
 const lines=result.code.split('\n'),defs=lines.filter(l=>/^#\d+=/.test(l));
 for(const [first,last] of [[1,2],[3,4]]){const a=lines.findIndex(l=>new RegExp('^N'+first+'G0').test(l)),b=lines.findIndex((l,i)=>i>a&&new RegExp('^N'+last+'G').test(l));assert.ok(a>0&&b>a);const code=[...defs,'G18G90',...lines.slice(a,b+1),'M30'].join('\n'),parsed=P.interpretar(code);assert.deepEqual(parsed.erros,[]);assert.ok(parsed.moves.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)));}
 const changed=structuredClone(d);changed.trechos1[0].a=82;const edited=drawingPreview(changed,[]);assert.deepEqual(edited.erros,[]);assert.ok(C.conferirColchetes(edited.code)<=2);
});
