const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const CAD=require('../public/engine/cadprofile.js'),C=require('../public/engine/core.js'),Prog=require('../public/engine/progsim.js');globalThis.CNC=C;globalThis.CNCPerfilCAD=CAD;
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),ctx);const tools=JSON.parse(JSON.stringify(ctx.window.CNC_SEED_TOOLS)).map((t,i)=>({...t,id:'s'+i}));
function disco(){const f=require('./fixtures/disco-7-gap.json'),G=require('../public/engine/dxfgeometry.js'),P=require('../public/engine/dxfprofile.js'),geometry=structuredClone(f.geometry);G.repairEndpoints(geometry,f.ids);return P.analyze({geometry,units:4},null,f.axis,'direita',new Set(f.ids)).nativeProfile}
test('sombra na rampa do Disco 7 mantém cilindragem no maior diâmetro sem modificar o desenho',async()=>{
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),{generate}=await import('../src/domain.mjs'),p=disco(),d=createOppositeCadSide({id:'disco',nome:'Disco 7',lPeca:p.length,lados:'1',trechos1:[{tipo:'cadperfil',path:p.path}],internos1:[],internos2:[],trechos2:[]}),before=structuredClone(d);
 const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:200,lBruto:p.length+2,sobre1:1,grip1:12,grip2:12}},maq:C.DEFAULT_MAQ};
 const continued=generate(form,[d],tools);assert.deepEqual(continued.erros,[]);assert.ok(continued.avisos.some(s=>/Cilindragem protegida.*Z-4.5.*Ø162.8.*54.75/.test(s)));assert.match(continued.lados[0].code,/G1X162\.8Z-54\.75/);
 const Sim=require('../public/engine/sim.js');for(const side of continued.lados){const scene=Prog.comDecodificado(Prog.comCompensacao(side.cena),side.code,side.cena.maq);assert.deepEqual(new Sim.Sim(scene).analyze().alerts,[])}
 for(const first of ['1','2']){const r=generate({...form,cadPrimeiro:{disco:first},cadUsinagem:{disco:{limite1:4.5,limite2:95}}},[d],tools);assert.deepEqual(r.erros,[]);assert.ok(r.avisos.some(s=>/Faixa central/.test(s)));for(const side of r.lados){assert.deepEqual(Prog.interpretar(side.code).erros,[]);assert.ok(side.cena.protect.length>10)}}assert.deepEqual(d,before);
});

test('cilindragem preserva o prefixo circular e respeita o maior raio da peça completa',()=>{
 const path=[{kind:'line',a:[0,0],b:[0,10]},{kind:'arc',a:[0,10],b:[-10,10],c:[-5,10],r:5,ccw:true},{kind:'line',a:[-10,10],b:[-40,10]}],before=structuredClone(path);
 const safe=CAD.safeMachiningPath(path,20);assert.equal(safe.ok,true);assert.equal(safe.deferred,true);assert.equal(safe.diameter,40);assert.equal(safe.length,40);assert.equal(safe.from,-5);assert.deepEqual(safe.path.at(-1).b,[-40,20]);assert.deepEqual(safe.path[1].c,[-5,10]);assert.equal(safe.path[1].r,5);assert.ok(Math.abs(safe.path[1].b[1]-15)<1e-9);assert.equal(CAD.machiningSafety(safe.path).ok,true);assert.deepEqual(path,before);assert.equal(CAD.safeMachiningPath(path,14).ok,false);
});
test('fresta entre retas e queda dentro de arco são detectadas mesmo com extremos iguais',()=>{
 const slot=[{kind:'line',a:[0,10],b:[-20,10]},{kind:'line',a:[-20,10],b:[-20,2]},{kind:'line',a:[-20,2],b:[-20.1,10]},{kind:'line',a:[-20.1,10],b:[-40,10]}],before=structuredClone(slot),s=CAD.machiningSafety(slot);assert.equal(s.ok,false);assert.equal(s.limit,20);assert.deepEqual(slot,before);
 const arc=[{kind:'arc',a:[0,10],b:[-10,10],c:[-5,10],r:5,ccw:false}];assert.equal(CAD.validate(arc).ok,true);assert.equal(CAD.machiningSafety(arc).ok,false);
});
test('comprimento na entrada da fresta para antes da face e não executa mergulho radial',async()=>{
 const {clipCadPath}=await import('../src/cad-sides.mjs'),path=[{kind:'line',a:[0,10],b:[-20,10]},{kind:'line',a:[-20,10],b:[-20,2]},{kind:'line',a:[-20,2],b:[-21,10]}],clipped=clipCadPath(path,20);
 assert.equal(clipped.length,1);assert.equal(CAD.machiningSafety(clipped).ok,true);const c=CAD.compile(clipped,15,'G71',C.fmt);assert.deepEqual(c.pts.at(-1),[-20,10]);assert.equal(c.moves.at(-1).g,'G0');assert.deepEqual(c.moves.at(-1).to,[-20,15]);
});
test('saída rápida não cria fresta artificial no encontro dos lados e sobra é um degrau',async()=>{
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),{generate}=await import('../src/domain.mjs');
 const d=createOppositeCadSide({id:'cil',nome:'Cilindro',lPeca:100,lados:'1',trechos1:[{tipo:'cadperfil',path:[{kind:'line',a:[0,0],b:[0,20]},{kind:'line',a:[0,20],b:[-100,20]},{kind:'line',a:[-100,20],b:[-100,0]}]}],internos1:[],internos2:[],trechos2:[]});
 const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:64,lBruto:102,sobre1:1,grip1:10,grip2:10}},maq:C.DEFAULT_MAQ};
 let r=generate(form,[d],tools);assert.deepEqual(r.erros,[]);assert.ok(!r.lados[1].cena.protect.some(p=>Math.abs(p[0]+50)<1e-6&&p[1]>20.001),'Não criar espinho do retorno rápido entre as metades');
 r=generate({...form,cadUsinagem:{cil:{limite1:30,limite2:20}}},[d],tools);assert.deepEqual(r.erros,[]);const pts=r.lados[1].cena.protect;assert.ok(pts.some(p=>p[0]===-20&&p[1]===32));assert.ok(pts.some(p=>p[0]===-70&&p[1]===32));
});
