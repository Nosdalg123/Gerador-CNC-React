const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const CAD=require('../public/engine/cadprofile.js'),DX=require('../public/engine/dxfcore.js'),T=require('../public/engine/dxfturn.js'),P=require('../public/engine/dxfprofile.js'),Audit=require('../public/engine/dxfaudit.js'),C=require('../public/engine/core.js'),Prog=require('../public/engine/progsim.js');
globalThis.CNC=C;globalThis.CNCPerfilCAD=CAD;const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),ctx);globalThis.CNC_SEED_TOOLS=JSON.parse(JSON.stringify(ctx.window.CNC_SEED_TOOLS));
const line=(id,a,b)=>({id,type:'LINE',a,b}),geometry=()=>[line('back',[50,100],[50,120]),line('cylinder',[50,120],[100,120]),{id:'radius',type:'ARC',c:[100,125],r:5,start:270,end:0},line('step',[105,125],[105,140]),line('cone',[105,140],[145,160]),line('front',[145,160],[150,100]),line('lower',[50,80],[145,40])];
const doc=()=>({geometry:geometry(),units:4}),rect={x1:47,y1:35,x2:153,y2:165};
function selected(d){return new Set(P.segments(d.geometry,rect).filter(s=>P.above(s,100)).map(s=>s.uid))}
test('meia seção com pontas no eixo, arco e face é cadeia válida sem contorno inferior',()=>{
 const d=doc(),ids=selected(d),a=P.analyze(d,rect,100,'direita',ids);assert.equal(a.canExport,true,JSON.stringify(a.alerts));assert.equal(a.nativeProfile.length,100);assert.equal(a.nativeProfile.radius,60);assert.equal(a.nativeProfile.path.length,6);assert.equal(a.nativeProfile.path.filter(s=>s.kind==='arc').length,1);assert.deepEqual(a.nativeProfile.path[0].a,[0,0]);assert.ok(!a.nativeProfile.path.some(s=>s.sourceId.startsWith('lower')));
 const audit=Audit.check({doc:d,axis:100,face:'direita',length:100,external:a,candidateSegments:a.candidate,nativeDimensions:[{kind:0,angle:0,measure:5000}]});assert.equal(audit.ok,true,JSON.stringify(audit));assert.equal(Audit.check({doc:d,axis:100,face:'direita',length:99,external:a}).ok,false);
 const upper={...d,geometry:d.geometry.filter(s=>s.id!=='lower')};assert.deepEqual(P.analyze(upper,rect,100,'direita',ids).nativeProfile.path,a.nativeProfile.path);
});

test('preparação libera a meia seção e explica face, comprimento, bifurcações e seleção pendentes',()=>{
 const d=doc(),a=P.analyze(d,rect,100,'direita',selected(d)),args={doc:d,axis:100,face:'direita',length:100,external:a};
 const before=structuredClone(args);assert.deepEqual(Audit.preparation(args),{ok:true,items:[]});assert.deepEqual(args,before);
 const missing=Audit.preparation({...args,face:'',length:''});assert.equal(missing.ok,false);assert.ok(missing.items.some(i=>/Face Z0/.test(i.problem)&&/etapa 2/.test(i.hint)));assert.ok(missing.items.some(i=>/Comprimento/.test(i.problem)&&/Usar comprimento do perfil/.test(i.hint)));
 const broken=doc();broken.geometry[1].b[0]-=.01;const gaps=Audit.preparation({...args,external:P.analyze(broken,rect,100,'direita',selected(broken))});assert.equal(gaps.ok,false);assert.ok(gaps.items.some(i=>/Ligar falhas/.test(i.hint)));
 const branch=doc();branch.geometry.push(line('branch',[105,140],[110,145]));assert.ok(Audit.preparation({...args,external:P.analyze(branch,rect,100,'direita',selected(branch))}).items.some(i=>/bifurcações/.test(i.hint)));
 assert.ok(Audit.preparation({...args,pendingEdit:true}).items.some(i=>/cancele/.test(i.hint)));assert.equal(Audit.preparation({...args,doc:{...d,units:1}}).ok,false);
 assert.ok(Audit.preparation({...args,external:P.analyze(d,rect,100,'direita',new Set())}).items.some(i=>/Ative Externo/.test(i.hint)));
});
test('orientação esquerda e direita preserva centro/raio e sentido real do arco',()=>{
 const d=doc(),a=P.analyze(d,rect,100,'direita',selected(d)).nativeProfile;
 const mirror=geometry().map(s=>({...s,...(s.a?{a:[200-s.a[0],s.a[1]],b:[200-s.b[0],s.b[1]]}:{c:[200-s.c[0],s.c[1]],start:180-s.start,end:180-s.end,sweep:-1})}));
 const d2={geometry:mirror,units:4},b=P.analyze(d2,rect,100,'esquerda',selected(d2)).nativeProfile;assert.equal(b.ok,true,JSON.stringify(b));assert.deepEqual(b.path.map(({sourceId,...s})=>s),a.path.map(({sourceId,...s})=>s));
 const arc=a.path.find(s=>s.kind==='arc');assert.equal(arc.r,5);assert.equal(arc.ccw,false);assert.deepEqual(arc.c,[-50,25]);
});
test('lacunas, bifurcações, retorno axial e curva abaixo do eixo bloqueiam a conversão',()=>{
 const d=doc();d.geometry[1].b[0]-=.01;assert.equal(P.analyze(d,rect,100,'direita',selected(d)).canExport,false);
 const branched=doc();branched.geometry.push(line('branch',[105,140],[110,145]));assert.equal(P.analyze(branched,rect,100,'direita',selected(branched)).canExport,false);
 assert.equal(CAD.validate([{kind:'line',a:[0,1],b:[1,2]}]).ok,false);
 const cross={kind:'arc',a:[0,0],b:[-10,0],c:[-5,0],r:5,ccw:false};assert.equal(CAD.validate([cross]).ok,false);
 const lower={kind:'line',a:[0,-.01],b:[-5,2]};assert.equal(CAD.validate([lower]).ok,false);
 const discontinuous=[{kind:'line',a:[0,2],b:[-5,2]},{kind:'line',a:[-5.002,2],b:[-10,3]}];assert.equal(CAD.validate(discontinuous).ok,false);
});
test('SVG inferior usa tracejado cinza e projeção limpa mantém as cotas na fonte',()=>{
 const d=doc();d.dimensions=[{position:[80,140],kind:0,measure:987.654}];const before=structuredClone(d),svg=P.svg(d,rect,{axis:100,face:'direita',selected:selected(d)});
 assert.match(svg,/data-reference="true"[^>]*stroke="#91a3b6"[^>]*stroke-dasharray="7 5"/);assert.ok(!svg.includes('987'));assert.deepEqual(d,before);assert.equal(P.above({kind:'line',a:[0,99.999],b:[10,100]},100),false);
});
test('prévia mostra o perfil integral sem alterar dados; CNC mantém conferência da fixação',async()=>{
 const {drawingPreview,generate}=await import('../src/domain.mjs'),d=doc(),native=P.analyze(d,rect,100,'direita',selected(d)).nativeProfile;
 const drawing={id:'cad',nome:'Superior',lados:'1',lPeca:100,dRef:124,trechos1:[{tipo:'cadperfil',id:'native',path:native.path}],trechos2:[],internos1:[],internos2:[],cadOrigem:{verificado:true,incompleto:false},extras:{preservar:true}},before=structuredClone(drawing),r=drawingPreview(drawing,[],'1');assert.deepEqual(r.erros,[]);assert.ok(r.cena.protect.length>65);assert.ok(r.cena.protect.every(p=>p[1]>=-1e-6));assert.deepEqual(drawing,before);
 const form={tipo:'peca_simples',desenhoSel:drawing.id,vals:{peca_simples:{dBruto:124,lBruto:102,grip1:10,usin1:'ext'}}};const blocked=generate(form,[drawing],globalThis.CNC_SEED_TOOLS);assert.ok(blocked.erros.some(s=>/castanhas|placa/.test(s)),JSON.stringify(blocked));assert.equal(blocked.code,undefined);const transverse=CAD.compile(native.path,62,'G72',C.fmt);assert.equal(transverse.ok,false);assert.match(transverse.problems[0],/G72/);
 // O percurso parcial abaixo é um teste do motor, com 20 mm deixados para a fixação.
 const partial={...drawing,lPeca:120};for(const mode of ['long','par']){const result=generate({...form,vals:{peca_simples:{dBruto:124,lBruto:122,grip1:10,usin1:'ext',sentE1:mode}}},[partial],globalThis.CNC_SEED_TOOLS);assert.deepEqual(result.erros,[]);assert.ok(result.avisos.some(s=>/Cilindragem protegida/.test(s)));assert.match(result.code,/G1X120Z-100/);assert.ok(!result.code.includes('R5'));assert.deepEqual(drawing,before);}
});
test('arco CNC circular preserva o centro interpretado e recusa bruto menor',()=>{
 const path=P.analyze(doc(),rect,100,'direita',selected(doc())).nativeProfile.path,ct=CAD.compile(path,62,'G71',C.fmt);
 assert.equal(ct.ok,true);assert.equal(CAD.compile(path,59,'G71',C.fmt).ok,false);const parsed=Prog.interpretar('G18G90\n#1=124\n#7=.15\n'+ct.moves.map(s=>s.code).join('\n')+'\nM30');assert.deepEqual(parsed.erros,[]);const arc=parsed.moves.filter(m=>m.label==='ARCO (G2)');assert.ok(arc.length>1);for(const m of arc)assert.ok(Math.abs(Math.hypot(m.z+50,m.x/2-25)-5)<1e-7);
 assert.equal(CAD.compile([{kind:'arc',a:[0,30],b:[-5,25],c:[-5,30],r:5,ccw:false}],62,'G72',C.fmt).ok,true);
 const semi=[{kind:'arc',a:[0,0],b:[-10,0],c:[-5,0],r:5,ccw:true}];const split=CAD.compile(semi,10,'G73',C.fmt);assert.equal(split.ok,true);assert.equal(split.moves.filter(s=>s.g==='G3').length,2);const mirrored=Prog.interpretar('G18G90\n#1=20\n#7=.15\n'+split.moves.map(s=>s.code).join('\n')+'\nM30');assert.deepEqual(mirrored.erros,[]);for(const m of mirrored.moves.filter(m=>m.label==='ARCO (G3)'))assert.ok(Math.abs(Math.hypot(m.z+5,m.x/2)-5)<1e-7);
});

test('backup CAD com ID em colisão preserva os antigos e liga desenhos ao rascunho importado',async()=>{
 const {mergeWorkspace,emptyDrawing}=await import('../src/data.mjs');const d={...emptyDrawing(),id:'old',nome:'Anterior',cadOrigem:{draftId:'same'}};const current={tools:[],drawings:[d],work:structuredClone(d),cadDrafts:[{id:'same',sourceDoc:{old:true}}],form:{}};const incoming={drawings:[{...d,id:'new',nome:'Importado'}],work:{...d,id:'new'},cadDrafts:[{id:'same',sourceDoc:{new:true}}]};const before=structuredClone(current),input=structuredClone(incoming),merged=mergeWorkspace(current,incoming,C);assert.deepEqual(current,before);assert.deepEqual(incoming,input);assert.deepEqual(merged.drawings[0],d);assert.deepEqual(merged.cadDrafts[0],current.cadDrafts[0]);assert.notEqual(merged.cadDrafts[1].id,'same');assert.equal(merged.drawings[1].cadOrigem.draftId,merged.cadDrafts[1].id);assert.equal(merged.work.cadOrigem.draftId,merged.cadDrafts[1].id);
});
