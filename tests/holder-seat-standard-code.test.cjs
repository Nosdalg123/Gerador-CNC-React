const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const C=require('../public/engine/core.js'),S=require('../public/engine/sim.js'),Setup=require('../public/engine/toolsetup.js');
globalThis.CNC=C;const seed={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),seed);globalThis.CNC_SEED_TOOLS=JSON.parse(JSON.stringify(seed.window.CNC_SEED_TOOLS));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('suporte externo vertical: centro/esquerda/direita seguem o croqui nas quatro montagens sem mudar o corte',async()=>{
 const {simulationToolParts}=await import('../src/assets/tool-drawing.mjs');
 for(const tipo of ['externa','faceamento'])for(const mount of ['inferior_esquerdo','inferior_direito','superior_esquerdo','superior_direito'])for(const seat of ['centro','esquerda','direita']){
  const tool={tipo,raio:.8,angulo:80,apSuporte:95,larguraInserto:12.7,espessuraHaste:24,posicaoInserto:mount},before=structuredClone(tool),base=C.simTool(tool,'rombo'),shape=C.simTool({...tool,assentoInserto:seat,orientacaoSuporte:'vertical'},'rombo'),parts=simulationToolParts(shape),cut=S.toolShape(shape);
  assert.deepEqual(cut,S.toolShape(base));assert.deepEqual(parts.ins,cut.pts);near(parts.shaft[1][0],parts.shaft[0][0]);near(Math.abs(parts.shaft[1][1]-parts.shaft[0][1]),55);
  const insertZ=(cut.bb[0]+cut.bb[1])/2,shaftZ=(parts.shaft[0][0]+parts.shaft[3][0])/2;near(insertZ-shaftZ,seat==='centro'?0:seat==='esquerda'?-12:12);
  near(Math.hypot(parts.shaft[0][0]-parts.shaft[3][0],parts.shaft[0][1]-parts.shaft[3][1]),24);assert.ok(S.inPoly(parts.hold,parts.furo[0],parts.furo[1]));assert.deepEqual(tool,before);
 }
});
test('assento em todos os suportes mantém os insertos antigos, referências e medidas',async()=>{
 const {simulationToolParts}=await import('../src/assets/tool-drawing.mjs');
 for(const [tipo,kind]of [['externa','rombo'],['interna','interna'],['encaixe','canal'],['encaixe','canalint'],['bedame','canalext'],['rosca','rosca'],['rosca','roscaint']])for(const seat of ['centro','esquerda','direita']){
  const tool={tipo,raio:.8,angulo:55,apSuporte:120,largura:4.5},base=C.simTool(tool,kind),changed=C.simTool({...tool,assentoInserto:seat},kind),parts=simulationToolParts(changed);
  assert.deepEqual(S.toolShape(base),S.toolShape(changed));assert.deepEqual(parts.ins,S.toolShape(base).pts);assert.ok(parts.hold.length>=4);
 }
 const internal=C.simTool({tipo:'interna',orientacaoSuporte:'vertical'},'interna');assert.equal(internal.holderOrientation,undefined);
});
test('T padrão conserva zeros e preenche posição/corretor; montagem do trabalho prevalece',async()=>{
 const {generate}=await import('../src/domain.mjs'),bank=CNC_SEED_TOOLS.map((t,i)=>({...t,id:'s'+i}));bank[0].tPadrao='0404';
 assert.deepEqual(Setup.standardCode(bank[0]),{code:'0404',position:'04',offset:'04'});assert.equal(Setup.standardCode({t:'9901'}),null);
 const setup=Setup.slotSetup({},'matriz_solida','t1',0,bank[0]);assert.equal(Setup.composeCode(setup.position,setup.offset),'0404');
 const a=generate({tipo:'matriz_solida'},[],bank);assert.deepEqual(a.erros,[]);assert.match(a.code,/#101=0404/);
 const b=generate({tipo:'matriz_solida',toolSetupByTipo:{matriz_solida:{t1:{position:'9',offset:'12'}}}},[],bank);assert.deepEqual(b.erros,[]);assert.match(b.code,/#101=0912/);assert.equal(bank[0].tPadrao,'0404');
 const invalid=generate({tipo:'matriz_solida'},[],bank.map((t,i)=>i===0?{...t,tPadrao:'0400'}:t));assert.ok(invalid.erros.some(e=>e.includes('número padrão')));assert.equal(invalid.code,undefined);
});
test('associação por T padrão é inequívoca e respeita escolha vazia, associação manual e tipo sugerido',()=>{
 const a={id:'a',tipo:'externa',tPadrao:'0404'},b={id:'b',tipo:'externa',tPadrao:'0505'},reference={codigo:'0404',sug:{tipo:'externa'}};
 assert.equal(Setup.programTool({},[a,b],reference),a);assert.equal(Setup.programTool({ferr:{'0404':''}},[a,b],reference),undefined);assert.equal(Setup.programTool({ferr:{'0404':'b'}},[a,b],reference),b);
 assert.equal(Setup.programTool({},[a,{...b,tPadrao:'0404'}],reference),undefined);assert.equal(Setup.programTool({},[a,{...b,tipo:'interna',tPadrao:'0404'}],reference),a);
});
test('cadastro recusa T parcial/zero e opções inexistentes, preservando campos vazios e T histórico',async()=>{
 const {validateToolGeometry}=await import('../src/tool-geometry-fields.mjs');
 for(const value of ['404','0400','0004','0000','T0404','abcd','04040'])assert.ok(validateToolGeometry({tipo:'externa',tPadrao:value}));
 for(const value of ['0404','9912','',undefined])assert.equal(validateToolGeometry({tipo:'externa',t:'0101',tPadrao:value,assentoInserto:'centro',orientacaoSuporte:'vertical'}),'');
 assert.ok(validateToolGeometry({assentoInserto:'outro'}));assert.ok(validateToolGeometry({orientacaoSuporte:'diagonal'}));
});
test('worker reconhece T0404 pelo padrão e conserva a montagem vertical externa na cena',()=>{
 const messages=[],root=path.resolve(__dirname,'../public/engine'),context=vm.createContext({postMessage:m=>messages.push(m),structuredClone});context.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));vm.runInContext(fs.readFileSync(path.join(root,'simulation-worker.js'),'utf8'),context);
 const tool={id:'a',tipo:'externa',tPadrao:'0404',raio:.8,angulo:80,orientacaoSuporte:'vertical',assentoInserto:'direita'},input={text:'G21G90G40G99\nT0404(DESBASTE EXTERNO)\nG97S1000M4\nG0X60Z2\nG1Z-20F.2\nM30',variables:'{}',maq:C.DEFAULT_MAQ,tools:[tool,{id:'b',tipo:'externa'}],state:{ferr:{},b:{}}};
 context.onmessage({data:{kind:'program',input}});const result=messages.at(-1);assert.equal(result.toolMissing.length,0);assert.equal(result.result.erros.length,0);assert.equal(result.scene.tools['0404'].holderOrientation,'vertical');assert.equal(result.scene.tools['0404'].insertSeat,'direita');assert.equal(tool.t,undefined);
});
