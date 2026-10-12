const test=require('node:test'),assert=require('node:assert/strict'),G=require('../public/engine/dxfgeometry.js'),DX=require('../public/engine/dxfcore.js'),P=require('../public/engine/dxfprofile.js'),CAD=require('../public/engine/cadprofile.js'),C=require('../public/engine/core.js'),Prog=require('../public/engine/progsim.js');
const L=(id,a,b)=>({id,type:'LINE',a,b,layer:'perfil',extra:{preserve:true}}),A=(id,c,r,start,end,sweep=1)=>({id,type:'ARC',c,r,start,end,sweep,layer:'perfil',extra:{preserve:true}}),ends=e=>DX.sample({...e,kind:e.type==='ARC'?'arc':'line'},1),near=(a,b)=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-6,JSON.stringify([a,b]));
function circlesUnchanged(original,geometry){for(const e of original.filter(e=>e.type==='ARC')){const actual=geometry.find(s=>s.id===e.id);assert.deepEqual(actual.c,e.c);assert.equal(actual.r,e.r);assert.equal(actual.sweep,e.sweep);assert.deepEqual(actual.extra,e.extra)}}
const touching=(gap=.5)=>[A('A',[10,20],10,90+gap,180),A('B',[10,40],10,270+gap,0)];
function native(geometry){const ids=new Set(P.segments(geometry).map(s=>s.uid)),bounds=DX.bounds(geometry),rect={x1:bounds.x1-1,x2:bounds.x2+1,y1:0,y2:bounds.y2+1};return P.analyze({geometry,units:4},rect,0,'direita',ids)}
test('Conectar reta e arco estende ambos até círculo exato, em qualquer ordem e sentido',()=>{
 for(const sweep of [1,-1])for(const reverse of [false,true]){
  const geo=[A('a',[0,0],10,sweep>0?0:180,sweep>0?80:100,sweep),L('b',[0,12],[0,20])],source=structuredClone(geo),r=G.connectLines(geo,...(reverse?['b:0','a:0']:['a:0','b:0']));
  assert.equal(r.ok,true,r.reason);near(r.meeting,[0,10]);near(ends(geo[0])[1],geo[1].a);assert.equal(P.connectivity(P.segments(geo)).components,1);circlesUnchanged(source,geo);assert.equal(r.corrections.length,2);
 }
});
test('Conectar arco e reta ajusta o extremo próximo quando encontro cai dentro do arco',()=>{
 const geo=[A('a',[0,0],10,0,110),L('b',[0,12],[0,20])],r=G.connectLines(geo,'a:0','b:0');assert.equal(r.ok,true,r.reason);near(ends(geo[0])[1],[0,10]);assert.equal(P.connectivity(P.segments(geo)).components,1);
});
test('Conectar dois arcos tangentes e co-circulares conserva centro, raio e sentido',()=>{
 for(const geo of [[A('a',[0,0],10,0,80),A('b',[0,20],10,280,0)],[A('a',[0,0],10,350,20),A('b',[0,0],10,25,80)]]){
  const source=structuredClone(geo),r=G.connectLines(geo,'a:0','b:0');assert.equal(r.ok,true,r.reason);assert.equal(P.connectivity(P.segments(geo)).components,1);circlesUnchanged(source,geo);
 }
});
test('Conectar escolhe encontro próximo entre dois círculos secantes; empate não muda desenho',()=>{
 const geo=[A('a',[0,0],10,0,40),A('b',[10,0],10,140,180)],source=structuredClone(geo),r=G.connectLines(geo,'a:0','b:0');assert.equal(r.ok,true,r.reason);near(r.meeting,[5,Math.sqrt(75)]);assert.equal(P.connectivity(P.segments(geo)).components,1);circlesUnchanged(source,geo);
 const ambiguous=[A('a',[0,0],10,100,260),L('b',[0,-1],[0,1])],before=structuredClone(ambiguous);assert.equal(G.connectLines(ambiguous,'a:0','b:0').ok,false);assert.deepEqual(ambiguous,before);
});
test('Ligar falhas ajusta extremos de dois arcos e produz perfil CNC circular válido',()=>{
 const geo=touching(),source=structuredClone(geo),r=G.linkGaps(geo,['A:0','B:0']);assert.equal(r.ok,true,r.reason);assert.equal(r.added.length,0);assert.equal(r.corrections.length,2);near(ends(geo[0])[0],ends(geo[1])[0]);circlesUnchanged(source,geo);
 const profile=native(geo);assert.equal(profile.canExport,true,JSON.stringify(profile.alerts));assert.equal(profile.nativeProfile.path.filter(s=>s.kind==='arc').length,2);
 const ct=CAD.compile(profile.nativeProfile.path,50,'G71',C.fmt);assert.equal(ct.ok,true,JSON.stringify(ct));const sim=Prog.interpretar('G18G90\n#1=90\n#7=.15\n'+ct.moves.map(m=>m.code).join('\n')+'\nM30');assert.deepEqual(sim.erros,[]);assert.equal(sim.truncado,false);
});
test('Ligar falhas entre círculos sem interseção cria ligação curta explícita e reversível',()=>{
 const geo=[A('a',[10,20],10,90,180),A('b',[10.1,40.01],10,270,0)],source=structuredClone(geo),r=G.linkGaps(geo,['a:0','b:0']);assert.equal(r.ok,true,r.reason);assert.equal(r.added.length,1);assert.equal(r.corrections[0].kind,'bridge');assert.deepEqual(geo.slice(0,2),source);assert.ok(r.maxDistance<.2);near(geo[2].a,ends(source[0])[0]);near(geo[2].b,ends(source[1])[0]);assert.deepEqual(G.restoreGeometry(source,G.geometryDelta(source,geo)),geo);assert.equal(native(geo).canExport,true,JSON.stringify(native(geo).alerts));
 const manual=structuredClone(source),joined=G.connectLines(manual,'a:0','b:0');assert.equal(joined.ok,true,joined.reason);assert.equal(joined.added.length,1);assert.deepEqual(manual,geo);
 assert.equal(G.endpointConnections(geo,geo.map(e=>e.id+':0'),{tolerance:.2,allowArcs:true}).ambiguous.length,0);
});
test('Ligar falhas entre reta e arco conserva arco e mantém a conexão existente do Disco',()=>{
 const geo=[L('l',[0,30],[10.1,30.01]),A('a',[10.15,40],10,270,0)],source=structuredClone(geo),r=G.linkGaps(geo,['l:0','a:0']);assert.equal(r.ok,true,r.reason);assert.deepEqual(geo[1],source[1]);near(geo[0].b,ends(geo[1])[0]);assert.equal(P.connectivity(P.segments(geo)).components,1);
});
test('Ligar falhas na mesma circunferência une ângulos sem criar segmento reto',()=>{
 const geo=[A('a',[0,20],10,0,90),A('b',[0,20],10,90.5,180)],source=structuredClone(geo),r=G.linkGaps(geo,['a:0','b:0']);assert.equal(r.ok,true,r.reason);assert.equal(r.added.length,0);assert.equal(geo.length,2);near(ends(geo[0])[1],ends(geo[1])[0]);circlesUnchanged(source,geo);
});
test('Ligar falhas não cria ponte atravessando outro elemento selecionado',()=>{
 const geo=[A('a',[10,20],10,90,180),A('b',[10.1,40.01],10,270,0),L('cross',[10.05,28],[10.05,32])],source=structuredClone(geo),r=G.linkGaps(geo,geo.map(e=>e.id+':0'));assert.equal(r.ok,false);assert.match(r.unresolved[0].reason,/cruzaria/);assert.deepEqual(geo,source);
});
test('Arcos de polilinha remapeiam vizinhos e conservam bulge/círculo e metadados',()=>{
 const poly={id:'p',type:'LWPOLYLINE',layer:'perfil',extra:'persistir',closed:false,v:[{x:0,y:0,bulge:Math.tan(Math.PI/8)},{x:10,y:10,bulge:0},{x:20,y:10,bulge:0}]},geo=[poly,L('b',[-1,-5],[-1,-2])],arc=DX.explode(poly)[0],r=G.connectLines(geo,'p:0','b:0');assert.equal(r.ok,true,r.reason);assert.ok(r.remap['p:1'].length);const output=geo.find(e=>e.cadSource==='p:0');assert.equal(output.r,arc.r);assert.deepEqual(output.c,arc.c);assert.equal(output.sweep,arc.sweep);assert.equal(output.extra,'persistir');
});
test('Limite de 0,2 mm, escolha ambígua, ocultação e ausência de encontro não alteram arcos',()=>{
 for(const gap of [.2,.200001,1]){const geo=[A('a',[10,20],10,90,180),A('b',[10+gap,40],10,270,0)],source=structuredClone(geo);assert.equal(G.linkGaps(geo,['a:0','b:0']).ok,false);assert.deepEqual(geo,source)}
 const geo=touching(),before=structuredClone(geo);assert.equal(G.linkGaps(geo,['A:0','B:0'],{hidden:new Set(['B:0'])}).ok,false);assert.deepEqual(geo,before);
 const far=[A('a',[0,0],10,0,90),A('b',[30,0],10,180,270)],original=structuredClone(far);assert.equal(G.connectLines(far,'a:0','b:0').ok,false);assert.deepEqual(far,original);
 const long=[A('a',[0,0],10,0,80),L('b',[-20000,10],[20000,10])],untouched=structuredClone(long);assert.equal(G.connectLines(long,'a:0','b:0').ok,false);assert.deepEqual(long,untouched);
 const branch=[...touching(),L('extra',[10,30.03],[15,35])],source=structuredClone(branch);assert.equal(G.linkGaps(branch,branch.map(e=>e.id+':0')).ok,false);assert.deepEqual(branch,source);
});
