const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../public/engine/core.js'),P=require('../public/engine/progsim.js');globalThis.CNC=C;
const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),context);globalThis.CNC_SEED_TOOLS=JSON.parse(JSON.stringify(context.window.CNC_SEED_TOOLS));
const drawing=()=>({id:'d',nome:'Cone',lados:'1',lPeca:100,dRef:100,trechos1:[{id:'cone',tipo:'cone',a:30,b:60,c:50}],trechos2:[],internos1:[],internos2:[],metadados:{origem:'preservar'}});
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function contour(code,internal=false){const lines=code.split('\n'),start=lines.findIndex(l=>new RegExp('^N'+(internal?'3':'1')+'G0').test(l)),end=lines.findIndex((l,i)=>i>start&&new RegExp('^N'+(internal?'4':'2')+'G').test(l));assert.ok(start>=0&&end>start);return [...lines.filter(l=>/^#\d+=/.test(l)),'G18G90',...lines.slice(start,end+1),'M30'].join('\n');}

test('raios são tangentes às duas arestas em cones rasos/íngremes e quinas internas/externas',()=>{
 for(const dz of [1,10,100])for(const dr of [.1,5,50])for(const sign of [-1,1])for(const radius of [.5,3,10]){
  const A=[0,0],B=[0,40],D=[-dz,40+sign*dr],curve=C.psCurvaCanto(A,B,D,radius,'raio');assert.ok(curve);
  near(Math.hypot(curve.from[0]-curve.center[0],curve.from[1]-curve.center[1]),radius);
  near(Math.hypot(curve.to[0]-curve.center[0],curve.to[1]-curve.center[1]),radius);
  near((curve.from[0]-curve.center[0])*(B[0]-A[0])+(curve.from[1]-curve.center[1])*(B[1]-A[1]),0);
  near((curve.to[0]-curve.center[0])*(D[0]-B[0])+(curve.to[1]-curve.center[1])*(D[1]-B[1]),0);
 }
 assert.equal(C.psCurvaCanto([0,0],[1,0],[2,0],1,'raio'),null);
});

test('quinas de cones e uniões contínuas ficam disponíveis; linhas colineares não oferecem quina falsa',()=>{
 const cone=drawing().trechos1;assert.deepEqual(C.psCantos(cone,50).map(c=>c.onde),['ini','fim']);
 const continuous=[{id:'c',tipo:'cil',a:30,b:20},...cone];assert.ok(C.psCantos(continuous,50).some(c=>c.alvo==='cone'&&c.onde==='ini'&&c.rot.includes('União')));
 const collinear=[...cone,{id:'same',tipo:'cone',a:60,b:90,c:50}];assert.equal(C.psCantos(collinear,60).some(c=>Math.abs(c.z+50)<1e-6),false);
 assert.deepEqual(C.psCantosInt([{id:'i',tipo:'icone',a:60,b:40,c:30}],8,50).map(c=>c.onde),['ini','fim']);
});

test('CNC de cones externo/interno contém arcos válidos e cálculos paramétricos de tangência',async()=>{
 const {drawingPreview}=await import('../src/domain.mjs');
 for(const internal of [false,true])for(const where of ['ini','fim']){
  const d=drawing();if(internal){d.trechos1=[{id:'ext',tipo:'cil',a:90,b:90}];d.internos1=[{id:'f',tipo:'furo',a:16,b:90},{id:'cone',tipo:'icone',a:60,b:40,c:50},{id:'radius',tipo:'iraio',a:3,alvo:'cone',onde:where}];}else d.trechos1.push({id:'radius',tipo:'raio',a:3,alvo:'cone',onde:where});
  const before=structuredClone(d),result=drawingPreview(d,[]);assert.deepEqual(result.erros,[]);assert.deepEqual(d,before);assert.match(result.code,/SQRT\[\[1-#/);
  const code=contour(result.code,internal),parsed=P.interpretar(code);assert.deepEqual(parsed.erros,[]);assert.equal(parsed.truncado,false);assert.ok(parsed.moves.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)));
  const geometry=internal?[60,40]:[30,60],R0=50,pilot=8,A=where==='ini'?[0,internal?R0:0]:[0,geometry[0]/2],B=where==='ini'?[0,geometry[0]/2]:[-50,geometry[1]/2],D=where==='ini'?[-50,geometry[1]/2]:[-50,internal?pilot:R0],curve=C.psCurvaCanto(A,B,D,3,'raio');
  assert.ok(parsed.moves.some(m=>Math.abs(m.x/2-curve.to[1])<1e-5&&Math.abs(m.z-curve.to[0])<1e-5));
 }
});

test('editar cotas nos parâmetros CNC recalcula a tangência em vez de congelar o arco',async()=>{
 const {drawingPreview}=await import('../src/domain.mjs'),d=drawing();d.trechos1.push({id:'r',tipo:'raio',a:3,alvo:'cone',onde:'ini'});const generated=drawingPreview(d,[]),code=contour(generated.code).replace(/^#201=60\(/m,'#201=80('),parsed=P.interpretar(code);assert.deepEqual(parsed.erros,[]);const curve=C.psCurvaCanto([0,0],[0,15],[-50,40],3,'raio');assert.ok(parsed.moves.some(m=>Math.abs(m.x/2-curve.to[1])<1e-5&&Math.abs(m.z-curve.to[0])<1e-5));
});

test('raios que não cabem, dois cantos sobrepostos e alvo removido bloqueiam CNC',async()=>{
 const {drawingPreview}=await import('../src/domain.mjs');
 for(const patch of [{a:100,alvo:'cone',onde:'ini'},{a:1,alvo:'apagado',onde:'ini'}]){const d=drawing();d.trechos1.push({id:'r',tipo:'raio',...patch});assert.ok(drawingPreview(d,[]).erros.length);assert.equal(drawingPreview(d,[]).code,undefined);}
 const d=drawing();d.trechos1=[{id:'a',tipo:'cil',a:30,b:20},{id:'cone',tipo:'cone',a:30,b:60,c:50},{id:'r',tipo:'raio',a:3,alvo:'a',onde:'fim'},{id:'r2',tipo:'raio',a:3,alvo:'cone',onde:'ini'}];assert.ok(drawingPreview(d,[]).erros.some(e=>e.includes('só um')));
 const short=drawing();Object.assign(short.trechos1[0],{b:30.2,c:1});short.trechos1.push({id:'r',tipo:'raio',a:3,alvo:'cone',onde:'ini'},{id:'r2',tipo:'raio',a:3,alvo:'cone',onde:'fim'});assert.ok(drawingPreview(short,[]).erros.some(e=>e.includes('não cabem')));
});

test('edição e adição preservam IDs/campos extras; canal sequencial posiciona o próximo elemento',async()=>{
 const {newElement,applyElement,elementCursor}=await import('../src/piece-elements.mjs'),d=drawing();d.trechos1[0].extra={dado:42};const modified={...d.trechos1[0],b:70},before=structuredClone(d),next=applyElement(d,'1',modified,0);assert.deepEqual(d,before);assert.equal(next.trechos1[0].id,'cone');assert.deepEqual(next.trechos1[0].extra,{dado:42});assert.deepEqual(next.metadados,d.metadados);
 const items=[{id:'c',tipo:'cil',a:60,b:20},{id:'g',tipo:'canal',a:50,c:5,seq:true}];near(elementCursor(items),25);const cone=newElement('cone',items);assert.equal(cone.a,60);assert.equal(cone.b,70);assert.ok(cone.id);assert.equal(applyElement(next,'1',cone).trechos1.length,2);
});

test('prévia do lado ativo funciona enquanto o outro está vazio; diâmetro automático inclui o fim do cone',async()=>{
 const {drawingPreview,drawingReference,corners}=await import('../src/domain.mjs'),d=drawing();d.lados='2';assert.deepEqual(drawingPreview(d,[],'1').erros,[]);assert.ok(drawingPreview(d,[],'2').erros.length);d.dRef='';d.trechos1[0].b=160;assert.equal(drawingReference(d),164);assert.ok(corners(d,'1',false).some(c=>c.onde==='fim'));
});

test('todos os elementos recuperados possuem ícones e croquis com as cotas necessárias',async()=>{
 const {elementDefinitions,elementIcons,elementDrawing}=await import('../src/assets/element-drawings.mjs'),{elementFields}=await import('../src/piece-elements.mjs');let count=0;
 for(const [type,def]of Object.entries(elementDefinitions).filter(([,d])=>!d.oculto)){count++;assert.ok(elementIcons[type]);if(def.marca)continue;const item={tipo:type,...def.d},diagram=elementDrawing(type,item);assert.ok(diagram.svg);for(const {key}of elementFields(item))assert.equal(diagram.box[key].length,2,type+' '+key);}
 assert.equal(count,13);
});

test('raio numa união contínua cone/cilindro interno impede canal sobre a tangência',async()=>{
 const {drawingPreview}=await import('../src/domain.mjs'),d=drawing();d.trechos1=[{id:'ex',tipo:'cil',a:90,b:90}];d.internos1=[{id:'f',tipo:'furo',a:16,b:80},{id:'cone',tipo:'icone',a:60,b:40,c:30},{id:'c',tipo:'icil',a:40,b:30},{id:'r',tipo:'iraio',a:8,alvo:'cone',onde:'fim'},{id:'canal',tipo:'icanal',a:44,b:30.5,c:2,seq:false}];const r=drawingPreview(d,[]);assert.ok(r.erros.some(e=>e.includes('canal invade')));assert.equal(r.code,undefined);
});

test('croquis de cones mostram o maior diâmetro do lado cotado, inclusive após inverter as cotas',async()=>{
 const {elementDrawing}=await import('../src/assets/element-drawings.mjs');
 for(const type of ['cone','icone'])for(const [a,b]of [[20,40],[40,20],[40,40]]){
  const d=elementDrawing(type,{tipo:type,a,b,c:25}),points=d.svg.match(new RegExp('class="'+(type==='cone'?'piece':'cav')+'" points="([^"]+)"'))[1].split(' ').map(p=>p.split(',').map(Number)),yA=points[type==='cone'?2:1][1],yB=points[type==='cone'?1:2][1];assert.equal(Math.sign(yA-yB),Math.sign(b-a));assert.ok(yA>=0&&yA<=190&&yB>=0&&yB<=190);near(d.box.a[1],(yA+190)/2);near(d.box.b[1],(yB+190)/2);
 }
});

test('programas completos de cones arredondados interpretam G71, G72 e G73 sem erros',async()=>{
 const {generate}=await import('../src/domain.mjs');
 for(const internal of [false,true])for(const mode of internal?['long','trans']:['long','trans','par']){
  const d=drawing();d.trechos1.push({id:'r',tipo:'raio',a:3,alvo:'cone',onde:'ini'},{id:'rf',tipo:'raio',a:2,alvo:'cone',onde:'fim'});
  if(internal){d.trechos1=[{id:'ex',tipo:'cil',a:90,b:90}];d.internos1=[{id:'f',tipo:'furo',a:18,b:80},{id:'cone',tipo:'icone',a:60,b:40,c:50},{id:'r',tipo:'iraio',a:3,alvo:'cone',onde:'ini'},{id:'rf',tipo:'iraio',a:2,alvo:'cone',onde:'fim'}];}
  const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:100,lBruto:102,grip1:.01,usin1:internal?'int':'ext',sentE1:mode,sentI1:mode}},maq:{...C.DEFAULT_MAQ,grip:.01}},tools=globalThis.CNC_SEED_TOOLS.map((t,i)=>({...t,id:'t'+i,...(t.tipo==='furacao'?{diametro:18}:{})})),r=generate(form,[d],tools);assert.deepEqual(r.erros,[]);const parsed=P.interpretar(r.code);assert.deepEqual(parsed.erros,[]);assert.equal(parsed.truncado,false);assert.ok(parsed.moves.length>10);assert.ok(parsed.moves.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)));
 }
});
