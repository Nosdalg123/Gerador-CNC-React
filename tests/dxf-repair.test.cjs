const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../public/engine/dxfgeometry.js'),P=require('../public/engine/dxfprofile.js'),A=require('../public/engine/dxfaudit.js'),CAD=require('../public/engine/cadprofile.js'),C=require('../public/engine/core.js'),Prog=require('../public/engine/progsim.js');
const fixture=require('./fixtures/disco-7-gap.json');
const L=(id,a,b)=>({id,type:'LINE',a,b,layer:'perfil',metadata:{preservar:true}});
test('Disco 7 real: folga da quebra tangente impede salvar e ajuste preserva quatro arcos',()=>{
 const doc={geometry:structuredClone(fixture.geometry),units:4},ids=new Set(fixture.ids),before=P.analyze(doc,fixture.rect,fixture.axis,'direita',ids),original=structuredClone(doc);
 assert.equal(before.canExport,false);assert.equal(before.connection.components,2);assert.match(before.nativeProfile.problems.join(' '),/0,003064 mm/);
 const bad=A.check({doc,axis:fixture.axis,face:'direita',length:109.5,external:before});assert.equal(bad.ok,false);assert.ok(!bad.problems.some(p=>/Sobreposição axial|Lacuna axial|sem tradução|conversão de canto|Projeção axial/.test(p)),JSON.stringify(bad));
 const arcs=structuredClone(doc.geometry.filter(e=>e.type==='ARC')),r=G.repairEndpoints(doc.geometry,fixture.ids);assert.equal(r.ok,true);assert.equal(r.corrections.length,4);assert.ok(Math.abs(r.maxDistance-.0030639354081848686)<1e-12);assert.deepEqual(doc.geometry.filter(e=>e.type==='ARC'),arcs);
 const after=P.analyze(doc,fixture.rect,fixture.axis,'direita',ids);assert.equal(after.canExport,true,JSON.stringify(after));assert.equal(after.connection.components,1);assert.equal(after.connection.gaps.length,2);assert.ok(Math.abs(after.nativeProfile.length-109.5)<1e-8);assert.ok(Math.abs(after.nativeProfile.radius*2-162.8)<1e-6);assert.equal(after.nativeProfile.path.length,10);assert.equal(after.nativeProfile.path.filter(s=>s.kind==='arc').length,4);
 assert.equal(A.check({doc,axis:fixture.axis,face:'direita',length:109.5,external:after}).ok,true);assert.equal(A.check({doc,axis:fixture.axis,face:'direita',length:105,external:after}).ok,false);
 assert.ok(Math.abs(after.nativeProfile.path.at(-1).b[1]-7.1)<1e-6);assert.deepEqual(doc.geometry.find(e=>e.id==='F4'),original.geometry.find(e=>e.id==='F4'));
 assert.deepEqual(G.restoreGeometry(original.geometry,G.geometryDelta(original.geometry,doc.geometry)),doc.geometry);
 const ct=CAD.compile(after.nativeProfile.path,84,'G71',C.fmt);assert.equal(ct.ok,true);const sim=Prog.interpretar('G18G90\n#1=168\n#7=.15\n'+ct.moves.map(m=>m.code).join('\n')+'\nM30');assert.deepEqual(sim.erros,[]);assert.equal(sim.truncado,false);assert.ok(sim.moves.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)));assert.equal(CAD.compile(after.nativeProfile.path,80,'G71',C.fmt).ok,false);
});
test('ajuste respeita limite, seleção, metadados e não aproxima cruzamentos ou bifurcações',()=>{
 const geo=[L('a',[0,0],[10,0]),L('b',[10.006,0],[20,0]),L('outside',[20.02,0],[30,0])],outside=structuredClone(geo[2]);
 const r=G.repairEndpoints(geo,['a:0','b:0','outside:0']);assert.equal(r.ok,true);assert.deepEqual(geo[1].a,[10,0]);assert.deepEqual(geo[2],outside);assert.equal(geo[1].metadata.preservar,true);assert.equal(geo[1].layer,'perfil');
 const ambiguous=[L('a',[0,0],[10,0]),L('b',[10.005,0],[20,0]),L('c',[10.007,0],[10,10])],before=structuredClone(ambiguous);assert.equal(G.repairEndpoints(ambiguous,['a:0','b:0','c:0']).ok,false);assert.deepEqual(ambiguous,before);
 assert.equal(G.repairEndpoints(before,['a:0']).ok,false);assert.equal(G.repairEndpoints(before,['a:0','b:0'],{hidden:new Set(['b:0'])}).ok,false);for(const tolerance of [0,-1,.201,Infinity,NaN])assert.equal(G.repairEndpoints(before,['a:0','b:0'],{tolerance}).ok,false);assert.deepEqual(before,ambiguous);
});
test('duas pontas de arcos não são movidas nem têm seus centros ou raios recalculados',()=>{
 const geo=[{id:'a',type:'ARC',c:[0,0],r:10,start:0,end:90},{id:'b',type:'ARC',c:[.005,20],r:10,start:270,end:0}],before=structuredClone(geo),r=G.repairEndpoints(geo,['a:0','b:0']);assert.equal(r.ok,false);assert.equal(r.unresolved.length,1);assert.deepEqual(geo,before);
});
test('Ligar falhas é estrito abaixo de 0,2 mm, conserva origem e restaura por delta',()=>{
 for(const gap of [.002,.019,.199,.199999]){
  const geometry=[L('a',[0,20],[10,20]),L('b',[10+gap,20],[20,20])],source=structuredClone(geometry),ids=['a:0','b:0'];
  const found=G.endpointConnections(geometry,ids,{tolerance:.2,strictLimit:true});assert.equal(found.pairs.length,1);assert.deepEqual(geometry,source);
  const result=G.linkGaps(geometry,ids);assert.equal(result.ok,true);assert.ok(result.maxDistance<.2);assert.equal(P.connectivity(P.segments(geometry)).components,1);assert.deepEqual(G.restoreGeometry(source,G.geometryDelta(source,geometry)),geometry);
 }
 for(const gap of [.2,.200001,1]){const geometry=[L('a',[0,20],[10,20]),L('b',[10+gap,20],[20,20])],source=structuredClone(geometry);assert.equal(G.linkGaps(geometry,['a:0','b:0']).ok,false);assert.deepEqual(geometry,source)}
});
test('Ligar falhas não fecha as duas pontas da mesma cadeia nem escolhe encontro ambíguo',()=>{
 const open=[L('a',[0,0],[10,0]),L('b',[10,0],[10,10]),L('c',[10,10],[0,.1])],source=structuredClone(open);assert.equal(G.linkGaps(open,['a:0','b:0','c:0']).ok,false);assert.deepEqual(open,source);
 const branch=[L('a',[0,0],[10,0]),L('b',[10.12,0],[20,0]),L('c',[10.1,.1],[20,10])],before=structuredClone(branch),ids=branch.map(e=>e.id+':0');assert.equal(G.linkGaps(branch,ids).ok,false);assert.ok(G.endpointConnections(branch,ids,{tolerance:.2,strictLimit:true}).ambiguous.length>0);assert.deepEqual(branch,before);
});
test('SVG indica correção com linha verde e encontro numerado sem perder referência inferior',()=>{
 const geo=[L('a',[0,100],[10,100]),L('b',[10.1,100],[20,100]),L('lower',[0,80],[20,80])],result=G.linkGaps(geo,['a:0','b:0']);assert.equal(result.ok,true);
 const svg=P.svg({geometry:geo},{x1:-3,x2:23,y1:75,y2:110},{axis:90,face:'direita',selected:new Set(['a:0','b:0']),corrected:new Set(result.corrections.map(c=>c.uid)),corrections:result.corrections});assert.match(svg,/data-cad-corrected="true"/);assert.match(svg,/stroke="#147c59"/);assert.match(svg,/data-cad-correction="1"/);assert.match(svg,/data-reference="true"/);assert.match(svg,/stroke-dasharray="7 5"/);
});
