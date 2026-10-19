const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../public/engine/core.js'),S=require('../public/engine/sim.js'),P=require('../public/engine/progsim.js'),D=require('../public/engine/diagnostico.js');
function scene(tool,{x=58,z=2,x1=x,z1=-20,bruto,rapid=false}={}){return {maq:C.DEFAULT_MAQ,bruto:bruto||{d:60,z0:0,z1:-40},tools:{a:tool},start:{x,z},path:[{t:rapid?'r':'f',x:x1,z:z1,f:.2,tool:'a',line:1}],semPerfil:true};}
const alerts=(s)=>new S.Sim(s).analyze().alerts;
const shape=(patch={})=>C.simTool({tipo:'externa',formatoInserto:'C',larguraInserto:12.7,raio:.4,angulo:80,apSuporte:95,incTorn:1,incFace:1,rpm:1000,modo:'G97',...patch},'rombo');
test('catálogo ISO separa C D V T W S R, sangrador e rosca conforme o tipo',async()=>{
 const {insertFormats,validateToolGeometry}=await import('../src/tool-geometry-fields.mjs');assert.deepEqual(insertFormats('externa').map(f=>f.id),['auto','C','D','V','T','W','S','R']);assert.deepEqual(insertFormats('bedame').map(f=>f.id),['auto','sangrador']);assert.deepEqual(insertFormats('rosca').map(f=>f.id),['auto','rosca60']);
 assert.ok(validateToolGeometry({tipo:'externa',formatoInserto:'sangrador'}));assert.throws(()=>C.simTool({tipo:'interna',formatoInserto:'???'},'interna'),/Formato/);assert.equal(validateToolGeometry({tipo:'externa',formatoInserto:'R',larguraInserto:12.7}),'');
});
test('normalização de formatos não altera o banco e raio do redondo acompanha o IC no gerador e corretor',async()=>{
 const Setup=require('../public/engine/toolsetup.js'),tool={id:'r',tipo:'externa',formatoInserto:'R',larguraInserto:10,raio:.8,angulo:35},before=structuredClone(tool),normal=C.normalizeInsert(tool);assert.equal(normal.raio,5);assert.deepEqual(tool,before);assert.equal(C.simTool(tool,'rombo').raio,5);assert.equal(Setup.programGeometry({ferr:{'0101':'r'}},[tool],{codigo:'0101'}).raio,5);assert.throws(()=>Setup.programGeometry({ferr:{'0101':'r'},setup:{'0101':{radius:.8}}},[tool],{codigo:'0101'}),/metade do IC/);
 assert.equal(C.normalizeInsert({...tool,formatoInserto:'D',angulo:80}).angulo,55);
 const {validateToolGeometry}=await import('../src/tool-geometry-fields.mjs');assert.ok(validateToolGeometry({tipo:'externa',formatoInserto:'T',larguraInserto:10,raio:5}));
});
test('triângulo e W possuem polígonos próprios, convexos e com o IC escolhido nas quatro montagens',async()=>{
 const {simulationToolParts,svgFerr}=await import('../src/assets/tool-drawing.mjs');
 for(const formatoInserto of ['C','D','V','T','W','S','R'])for(const posicaoInserto of ['inferior_esquerdo','inferior_direito','superior_esquerdo','superior_direito']){
  const f=shape({formatoInserto,posicaoInserto,raio:0}),sh=S.toolShape(f),parts=simulationToolParts(f);
  assert.deepEqual(parts.ins,sh.pts);assert.deepEqual(parts,S.simulationToolParts(f));assert.ok(parts.hold.length>=4);assert.match(svgFerr(f),new RegExp('data-insert-shape="'+formatoInserto+'"'));
  for(let i=0;i<sh.pts.length;i++){const a=sh.pts[i],b=sh.pts[(i+1)%sh.pts.length],c=sh.pts[(i+2)%sh.pts.length];assert.ok((b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])>=-1e-8,'Polígono convexo '+formatoInserto);}
  if(formatoInserto==='T')assert.equal(sh.pts.length,3);if(formatoInserto==='W')assert.equal(sh.pts.length,6);
  if(formatoInserto==='R'){assert.equal(sh.pts.length,64);assert.equal(f.raio,6.35);assert.ok(Math.abs(sh.bb[1]-sh.bb[0]-12.7)<1e-8);}
 }
 const c=S.toolShape(shape({raio:0})),w=S.toolShape(shape({formatoInserto:'W',raio:0}));assert.notDeepEqual(w.pts,c.pts);
});
test('haste toca bruto sem a ponta tocar: alerta tanto em G0 como em G1 e sem remover material pela haste',()=>{
 const tool=shape({orientacaoSuporte:'vertical',assentoInserto:'direita',espessuraHaste:28,posicaoInserto:'auto'}),bruto={d:60,z0:0,z1:-40};
 // Ponta à direita da face, haste deslocada à esquerda intercepta a peça.
 for(const rapid of [false,true]){const s=scene(tool,{x:32,z:6,z1:5,bruto,rapid}),sim=new S.Sim(s),before=sim.mat.slice(),a=sim.analyze();assert.ok(a.alerts.some(a=>a.type==='haste'),JSON.stringify(a.alerts));assert.deepEqual(sim.mat,before);sim.seek(sim.total);assert.ok(sim.mat.some(Boolean));}
 assert.ok(!alerts(scene(tool,{x:100,z:10,z1:5})).some(a=>['haste','incremento','inserto'].includes(a.type)));
});
test('incTorn é profundidade no raio: passe de 1 mm livre, engajamento de 4 mm alerta',()=>{
 const tool=shape();const good=alerts(scene(tool));assert.ok(!good.some(a=>['incremento','inserto','haste'].includes(a.type)),JSON.stringify(good));
 const bad=alerts(scene(tool,{x:52}));assert.ok(bad.some(a=>a.type==='incremento'),JSON.stringify(bad));assert.match(bad.find(a=>a.type==='incremento').text,/raio.*1 mm/);
 assert.ok(!alerts(scene(shape({incTorn:5}),{x:52})).some(a=>a.type==='incremento'));
});
test('faceamento usa incFace em Z; incremento ausente não inventa um limite',()=>{
 const tool=shape({incTorn:10,incFace:1}),bad=alerts(scene(tool,{x:62,z:-4,x1:20,z1:-4}));assert.ok(bad.some(a=>a.type==='incremento'&&/em Z/.test(a.text)),JSON.stringify(bad));
 assert.ok(!alerts(scene(shape({incTorn:0}),{x:52})).some(a=>a.type==='incremento'));
});
test('contato posterior do inserto é detectado antes que a remoção o esconda',()=>{
 const tool=shape({incTorn:0,espessuraHaste:1}),sim=new S.Sim(scene(tool,{x:28,z:-10,z1:-10.1})),first=sim.analyze();assert.ok(first.alerts.some(a=>a.type==='inserto'),JSON.stringify(first.alerts));assert.equal(first.alerts.find(a=>a.type==='inserto').t,0);assert.deepEqual(sim.analyze(),first);
});
test('análise e animação removem o mesmo material, inclusive no primeiro ponto do programa',()=>{
 const s=scene(shape(),{x:28,z:-10,z1:-10.1});s.semPerfil=false;const sim=new S.Sim(s),analysis=sim.analyze();sim.seek(sim.total);let cells=0;for(let i=0;i<sim.mat.length;i++)if(sim.clear[i]&&sim.mat[i])cells++;assert.equal(analysis.sobraArea,cells*sim.cs*sim.cs);
 const final=sim.mat.slice();sim.seek(0);sim.seek(sim.total/2);sim.seek(sim.total);assert.deepEqual(sim.mat,final);
});
test('sangrador pode usar a largura frontal inteira, mas o corpo distante da aresta não pode entrar no bruto',()=>{
 const tool=C.simTool({tipo:'bedame',formatoInserto:'sangrador',largura:5,comprimentoInserto:14,incCanal:1,rpm:1000},'canalext');
 const good=alerts(scene(tool,{x:62,z:-10,x1:50,z1:-10}));assert.ok(!good.some(a=>['incremento','inserto','haste'].includes(a.type)),JSON.stringify(good));
 assert.ok(alerts(scene(tool,{x:30,z:-10,x1:29,z1:-10})).some(a=>a.type==='inserto'));
});
test('geometria de corpo compartilhada conserva furo pré-existente; haste detecta ombro e placa',()=>{
 const tool=C.simTool({tipo:'interna',formatoInserto:'D',larguraInserto:9.525,raio:.4,espessuraHaste:8,incTorn:1,incFace:1},'interna');
 const bruto={d:60,z0:0,z1:-40,vazios:[[[5,-1],[-45,-1],[-45,21],[5,21]]]};
 assert.ok(!alerts(scene(tool,{x:40,z:2,z1:-20,bruto})).some(a=>a.type==='haste'));
 const colliding=shape({orientacaoSuporte:'vertical',assentoInserto:'direita',espessuraHaste:28});const s=scene(colliding,{x:32,z:6,z1:5});s.chuck={zFace:0,zBack:-60,rOut:50};assert.ok(alerts(s).some(a=>a.type==='placa'));
 for(const type of ['haste','inserto','incremento'])assert.equal(D.deAlerta({type,text:''}).sev,'erro');
});
test('worker e programa conservam formato e incrementos na análise sem alterar banco',()=>{
 const tool={id:'a',tipo:'externa',formatoInserto:'W',larguraInserto:12.7,raio:.8,incTorn:1,incFace:2,tPadrao:'0404'},before=structuredClone(tool),messages=[],root=path.resolve(__dirname,'../public/engine'),context=vm.createContext({postMessage:m=>messages.push(m),structuredClone});context.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));vm.runInContext(fs.readFileSync(path.join(root,'simulation-worker.js'),'utf8'),context);
 context.onmessage({data:{kind:'program',input:{text:'G21G90G40G99\nT0404(DESBASTE EXTERNO)\nG97S1000M4\nG0X52Z2\nG1Z-20F.2\nM30',variables:'{}',maq:C.DEFAULT_MAQ,tools:[tool],state:{ferr:{},b:{d:60}}}}});const result=messages.at(-1);assert.ok(result.scene,JSON.stringify(result));assert.equal(result.scene.tools['0404'].insertShape,'W');assert.equal(result.scene.tools['0404'].incTorn,1);
 context.onmessage({data:{kind:'simulation',input:{scene:result.scene}}});const simulation=messages.at(-1);assert.ok(simulation.analysis.alerts.some(a=>a.type==='incremento'));assert.deepEqual(tool,before);
});
