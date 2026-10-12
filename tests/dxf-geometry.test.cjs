const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../public/engine/dxfgeometry.js'),DX=require('../public/engine/dxfcore.js'),P=require('../public/engine/dxfprofile.js');
const L=(id,a,b)=>({type:'LINE',id,layer:'perfil',a,b,metadata:{preservar:true}}),A=(id,c,r,start,end)=>({type:'ARC',id,layer:'curvas',c,r,start,end});
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>{assert.equal(a.length,b.length);a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-8,`${a} != ${b}`))};
const ends=e=>DX.sample(e.kind?e:DX.explode(e)[0],1);
test('quebra pelo eixo zero e por todos os cruzamentos, sem criar eixo exportável',()=>{
 const geo=[L('a',[0,-10],[0,10]),L('b',[-5,5],[5,5]),L('c',[-5,0],[5,0])],before=copy(geo);
 const r=G.breakSegment(geo,'a:0',{axis:0});assert.equal(r.pieces,3);assert.equal(geo.length,5);
 const parts=r.remap['a:0'].map(id=>geo.find(e=>e.id+':0'===id));assert.deepEqual(parts.map(e=>[e.a,e.b]),[[[0,-10],[0,0]],[[0,0],[0,5]],[[0,5],[0,10]]]);
 assert.ok(parts.every(e=>e.layer==='perfil'&&e.metadata.preservar));assert.deepEqual(geo.slice(-2),before.slice(1));assert.ok(!geo.some(e=>e.id==='__cad_axis__'));
});
test('quebra respeita linhas ocultadas e contato só na extremidade não altera nada',()=>{
 const geo=[L('a',[0,0],[10,0]),L('b',[5,-5],[5,5]),L('end',[10,0],[10,5])],before=copy(geo);
 assert.equal(G.breakSegment(geo,'a:0',{hidden:new Set(['b:0'])}).ok,false);assert.deepEqual(geo,before);
});
test('interseções e quebra de arco preservam raio e orientação exatos',()=>{
 const geo=[A('a',[0,0],10,270,90)],r=G.breakSegment(geo,'a:0',{axis:0});assert.equal(r.pieces,2);
 near(ends(geo[0])[0],[0,-10]);near(ends(geo[0])[1],[10,0]);near(ends(geo[1])[1],[0,10]);assert.ok(geo.every(e=>e.r===10));
 const cw=[{...A('cw',[0,0],10,90,270),sweep:-1}];assert.equal(G.breakSegment(cw,'cw:0',{axis:0}).pieces,2);near(ends(cw[0])[1],[10,0]);assert.ok(cw.every(e=>e.sweep===-1));
});
test('quebra e extensão atingem círculo/arco real, sem prolongar a linha limitante',()=>{
 const geo=[L('a',[-20,0],[20,0]),{type:'CIRCLE',id:'c',c:[0,0],r:5}];assert.equal(G.breakSegment(geo,'a:0').pieces,3);near(geo[0].b,[-5,0]);near(geo[1].b,[5,0]);
 const ext=[L('a',[-20,0],[-10,0]),A('arc',[0,0],5,90,270)];const r=G.extendToNext(ext,'a:0','fim');assert.equal(r.target,'arc:0');near(ext[0].b,[-5,0]);
});
test('extensão em mm nas duas extremidades mantém direção e recusa falhas sem mutação',()=>{
 const geo=[L('a',[0,0],[3,4])];assert.equal(G.extendLine(geo,'a:0','fim',5).ok,true);near(geo[0].b,[6,8]);assert.equal(G.extendLine(geo,'a:0','ini',10).ok,true);near(geo[0].a,[-6,-8]);
 const before=copy(geo);for(const [end,mm]of [['ini',0],['fim',-2],['fim',Infinity],['fim',10001],['outro',2]])assert.equal(G.extendLine(geo,'a:0',end,mm).ok,false);assert.deepEqual(geo,before);
});
test('até próxima linha escolhe o primeiro encontro finito e inclui eixo sem mudar a origem',()=>{
 const geo=[L('a',[0,10],[0,15]),L('far',[-10,30],[10,30]),L('near',[-10,20],[10,20]),L('miss',[5,18],[10,18])];
 let r=G.extendToNext(geo,'a:0','fim');assert.equal(r.target,'near:0');near(geo[0].b,[0,20]);
 r=G.extendToNext(geo,'a:0','ini',{axis:0});assert.equal(r.target,'__cad_axis__');assert.equal(r.length,10);near(geo[0].a,[0,0]);assert.equal(geo.length,4);
});
test('até próxima linha ignora alvos ocultos; ausência de alvo não muda a geometria',()=>{
 const geo=[L('a',[0,0],[5,0]),L('hit',[10,-5],[10,5])],before=copy(geo);assert.equal(G.extendToNext(geo,'a:0','fim',{hidden:new Set(['hit:0'])}).ok,false);assert.deepEqual(geo,before);
});
test('conexão prolonga duas linhas até encontro e preserva metadados',()=>{
 const geo=[L('a',[0,0],[10,0]),L('b',[15,5],[15,10])],r=G.connectLines(geo,'a:0','b:0');assert.equal(r.changes.length,2);near(r.meeting,[15,0]);near(geo[0].b,[15,0]);near(geo[1].a,[15,0]);assert.ok(geo.every(e=>e.metadata.preservar));
});
test('conexão em T estende só o trecho necessário e colineares preenchem a lacuna',()=>{
 const geo=[L('a',[0,0],[10,0]),L('b',[5,5],[5,10])];assert.equal(G.connectLines(geo,'a:0','b:0').changes.length,1);near(geo[0].b,[10,0]);near(geo[1].a,[5,0]);
 const aligned=[L('a',[0,0],[10,0]),L('b',[20,0],[15,0])];near(G.connectLines(aligned,'a:0','b:0').meeting,[12.5,0]);near(aligned[0].b,aligned[1].b);
});
test('conexão de paralelas, mesmo elemento ou encontro distante falha sem edição parcial',()=>{
 for(const geo of [[L('a',[0,0],[10,0]),L('b',[0,5],[10,5])],[L('a',[0,0],[10,0]),L('b',[20000,5],[20000,10])]]){const before=copy(geo);assert.equal(G.connectLines(geo,'a:0','b:0').ok,false);assert.equal(G.connectLines(geo,'a:0','a:0').ok,false);assert.deepEqual(geo,before)}
});
test('polilinha edita trechos retos, remapeia vizinhos e conserva bulge como arco circular',()=>{
 const poly={type:'LWPOLYLINE',id:'p',layer:'perfil',closed:false,v:[{x:0,y:0,bulge:0},{x:10,y:0,bulge:1},{x:20,y:0,bulge:0}]},geo=[poly];
 const arc=DX.explode(poly)[1],r=G.extendLine(geo,'p:0','ini',5);assert.equal(r.ok,true);assert.equal(r.remap['p:1'].length,1);assert.equal(geo[1].type,'ARC');assert.equal(geo[1].r,arc.r);near(geo[0].a,[-5,0]);near(ends(geo[1])[0],ends(arc)[0]);near(ends(geo[1])[1],ends(arc)[1]);
});
test('deduplicação independe da ordem, elimina reversas e mantém a maior em sobreposição parcial',()=>{
 const geo=[L('small',[5,0],[15,0]),L('big',[0,0],[12,0]),L('reverse',[12,0],[0,0]),L('inner',[2,0],[8,0])],source=copy(geo);const r=G.dedupeGeometry(geo);assert.equal(r.duplicates,1);assert.equal(r.overlaps,2);assert.deepEqual(geo,[source[1]]);assert.equal(source.length,4);
});
test('deduplicação distingue cruzamentos, contatos e paredes paralelas próximas',()=>{
 const geo=[L('a',[0,0],[10,0]),L('touch',[10,0],[20,0]),L('cross',[5,-5],[5,5]),L('wall',[0,0.0001],[10,0.0001])],before=copy(geo);assert.equal(G.dedupeGeometry(geo).removed.length,0);assert.deepEqual(geo,before);
});
test('deduplicação remove só a aresta repetida da polilinha e mantém o restante',()=>{
 const geo=[L('large',[-5,0],[15,0]),{type:'LWPOLYLINE',id:'p',closed:false,v:[{x:0,y:0,bulge:0},{x:10,y:0,bulge:1},{x:20,y:0,bulge:0}]}];const r=G.dedupeGeometry(geo);assert.equal(r.overlaps,1);assert.deepEqual(r.remap['p:0'],[]);assert.equal(geo.length,2);assert.equal(geo[1].type,'ARC');assert.equal(geo[1].r,5);
});
test('arcos coincidentes mantêm o maior, círculos repetidos são removidos e raios distintos ficam',()=>{
 const geo=[A('small',[0,0],10,0,90),A('large',[0,0],10,0,180),A('dup',[0,0],10,0,180),{type:'CIRCLE',id:'c1',c:[40,0],r:10},{type:'CIRCLE',id:'c2',c:[40,0],r:10},{type:'CIRCLE',id:'c3',c:[40,0],r:9}];const r=G.dedupeGeometry(geo);assert.equal(r.overlaps,1);assert.equal(r.duplicates,2);assert.deepEqual(geo.map(e=>e.id),['large','c1','c3']);
});
test('delta reabre limpeza, quebra, conexão e campos adicionais sem duplicar o original',()=>{
 const original=[L('a',[0,-10],[0,10]),L('dup',[0,10],[0,-10]),L('c',[10,10],[15,10]),L('d',[20,15],[20,20])],geo=copy(original),before=copy(original);
 G.dedupeGeometry(geo);G.breakSegment(geo,'a:0',{axis:0});G.connectLines(geo,'c:0','d:0');const delta=G.geometryDelta(original,geo);assert.ok(delta.removed.includes('dup'));assert.deepEqual(G.restoreGeometry(original,copy(delta)),geo);assert.deepEqual(original,before);assert.throws(()=>G.restoreGeometry(original,{...delta,order:['inexistente']}));
});
test('SVG destaca seleção de edição, eixo fica construção e abaixo do eixo não exporta',()=>{
 const doc={geometry:[L('a',[0,-5],[10,5])],units:4};const svg=P.svg(doc,null,{axis:0,editing:new Set(['a:0'])});assert.match(svg,/data-cad-axis="true"/);assert.match(svg,/#813ac2/);assert.equal(P.analyze(doc,null,0,'direita',new Set(['a:0'])).selected.length,0);
});
