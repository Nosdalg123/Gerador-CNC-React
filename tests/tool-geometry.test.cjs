const test=require('node:test'),assert=require('node:assert/strict'),S=require('../public/engine/sim.js'),C=require('../public/engine/core.js'),Setup=require('../public/engine/toolsetup.js');
test('montagem física espelha inserto e haste, preserva espessura e sugere ponta sem fixar T',async()=>{
 const {simulationToolParts}=await import('../src/assets/tool-drawing.mjs');
 for(const [position,zSign,rSign,tip]of [['inferior_esquerdo',1,1,3],['inferior_direito',-1,1,4],['superior_esquerdo',1,-1,2],['superior_direito',-1,-1,1]]){
  const tool={tipo:'externa',angulo:80,raio:.8,apSuporte:95,larguraInserto:12.7,espessuraHaste:32,posicaoInserto:position},before=structuredClone(tool),shape=C.simTool(tool,'rombo'),cut=S.toolShape(shape),parts=simulationToolParts(shape);
  assert.equal(Setup.defaultTip(tool),tip);assert.deepEqual(cut.nose,[zSign*.8,rSign*.8]);assert.deepEqual(parts.ins,cut.pts);assert.ok(zSign*parts.shaft.at(-1)[0]>0);assert.ok(rSign*parts.shaft.at(-1)[1]>0);assert.ok(Math.abs(Math.hypot(parts.shaft[0][0]-parts.shaft[3][0],parts.shaft[0][1]-parts.shaft[3][1])-32)<1e-8);assert.ok(S.inPoly(cut.pts,parts.furo[0],parts.furo[1]));assert.ok(S.inPoly(parts.hold,parts.furo[0],parts.furo[1]));assert.deepEqual(tool,before);assert.equal(tool.t,undefined);
  const points=cut.pts;let area=0;for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];area+=p[0]*q[1]-q[0]*p[1]}assert.ok(area>0,'Espelhos devem manter polígono anti-horário para remover material');
 }
});
test('largura do canal e comprimento do inserto são medidas independentes e honradas',()=>{
 const a=S.toolShape(C.simTool({tipo:'encaixe',largura:.2,comprimentoInserto:18,posicaoInserto:'auto'},'canalext'));assert.equal(a.bb[1]-a.bb[0],.2);assert.equal(a.bb[3]-a.bb[2],18);
 const drill=S.toolShape(C.simTool({tipo:'furacao',diametro:.2,posicaoInserto:'auto'},'broca'));assert.equal(drill.bb[3],.1);
 const b=S.toolShape(C.simTool({tipo:'externa',angulo:80,larguraInserto:12.7,posicaoInserto:'auto'},'rombo'));const p=b.pts;const edge=Math.hypot(p[1][0]-p[0][0],p[1][1]-p[0][1]);assert.ok(Math.abs(edge*Math.sin(80*Math.PI/180)-12.7)<1e-8);
});
test('κ muda inserto e suporte, sem movimentar a referência do corretor',async()=>{
 const {simulationToolParts}=await import('../src/assets/tool-drawing.mjs');const tool={tipo:'externa',raio:.8,angulo:55,larguraInserto:12.7,espessuraHaste:20,posicaoInserto:'inferior_esquerdo'},a=C.simTool({...tool,apSuporte:95},'rombo'),b=C.simTool({...tool,apSuporte:120},'rombo');assert.notDeepEqual(S.toolShape(a).pts,S.toolShape(b).pts);assert.notDeepEqual(simulationToolParts(a).hold,simulationToolParts(b).hold);assert.deepEqual(S.toolShape(a).nose,[.8,.8]);assert.deepEqual(S.toolShape(b).nose,[.8,.8]);
});
test('geometria valida dimensões e campos próprios de cada tipo',async()=>{
 const {geometryKeys,validateToolGeometry}=await import('../src/tool-geometry-fields.mjs');assert.ok(geometryKeys('encaixe').includes('largura'));assert.ok(geometryKeys('externa').includes('larguraInserto'));assert.ok(!geometryKeys('furacao').includes('apSuporte'));assert.equal(validateToolGeometry({larguraInserto:12.7,espessuraHaste:32,raio:.8,posicaoInserto:'superior_direito'}),'');for(const tool of [{espessuraHaste:-1},{largura:0},{larguraInserto:1,raio:1},{posicaoInserto:'inexistente'},{apSuporte:180}])assert.ok(validateToolGeometry(tool));assert.equal(validateToolGeometry({tipo:'externa',larguraInserto:12.7,raio:8,angulo:80}),'');assert.throws(()=>Setup.programGeometry({ferr:{'0909':'a'},setup:{'0909':{radius:20}}},[{id:'a',tipo:'externa',larguraInserto:12.7,angulo:80}],{codigo:'0909'}),/não cabe/);
});
