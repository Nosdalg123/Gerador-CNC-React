const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const CAD=require('../public/engine/cadprofile.js'),C=require('../public/engine/core.js'),Prog=require('../public/engine/progsim.js');globalThis.CNC=C;globalThis.CNCPerfilCAD=CAD;
const ctx={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../public/engine/seed.js'),'utf8'),ctx);const tools=JSON.parse(JSON.stringify(ctx.window.CNC_SEED_TOOLS)).map((t,i)=>({...t,id:'t'+i}));
const path=[{kind:'line',a:[0,0],b:[0,20]},{kind:'line',a:[0,20],b:[-40,20]},{kind:'arc',a:[-40,20],b:[-45,25],c:[-40,25],r:5,ccw:false},{kind:'line',a:[-45,25],b:[-100,30]},{kind:'line',a:[-100,30],b:[-100,0]}];
const drawing=()=>({id:'test',nome:'Eixo CAD',lPeca:100,lados:'1',trechos1:[{id:'cad',tipo:'cadperfil',path:structuredClone(path)}],trechos2:[],internos1:[],internos2:[],cadOrigem:{nativo:true,verificado:true,incompleto:false},custom:{preservar:1}});
test('lado 2 inverte Z e ordem sem mudar raio, sentido combinado e dados de origem',async()=>{
 const {createOppositeCadSide,reverseCadPath}=await import('../src/cad-sides.mjs'),source=drawing(),before=structuredClone(source),d=createOppositeCadSide(source);
 assert.deepEqual(source,before);assert.deepEqual(d.custom,source.custom);assert.equal(d.lados,'2');assert.deepEqual(d.cadDuplo,{modo:'invertido',limite1:50,limite2:50,primeiro:'1'});assert.deepEqual(d.trechos1,source.trechos1);
 const second=d.trechos2[0].path;assert.equal(CAD.validate(second).ok,true);const arc=second.find(s=>s.kind==='arc');assert.equal(arc.r,5);assert.equal(arc.ccw,false);assert.deepEqual(arc.c,[-60,25]);assert.deepEqual(reverseCadPath(second,100),path);
});
test('limite em arco mantém círculo nativo e limite em cone mantém interpolação',async()=>{
 const {clipCadPath}=await import('../src/cad-sides.mjs'),arc=clipCadPath(path,42).at(-1);assert.equal(arc.kind,'arc');assert.deepEqual(arc.c,[-40,25]);assert.equal(arc.r,5);assert.ok(Math.abs(arc.b[0]+42)<1e-8);assert.ok(Math.abs(Math.hypot(arc.b[0]+40,arc.b[1]-25)-5)<1e-10);
 const cone=clipCadPath(path,50).at(-1);assert.equal(cone.kind,'line');assert.ok(Math.abs(cone.b[1]-(25+5*5/55))<1e-9);assert.deepEqual(clipCadPath(path,100),path);for(const n of [0,-1,101,NaN])assert.throws(()=>clipCadPath(path,n));
});
test('limites cobrem peça, rejeitam lacuna e não alteram perfis completos salvos',async()=>{
 const {createOppositeCadSide,prepareCadSides}=await import('../src/cad-sides.mjs'),d=createOppositeCadSide(drawing()),before=structuredClone(d),prepared=prepareCadSides(d,'2');assert.equal(CAD.validate(prepared.trechos1[0].path).length,50);assert.deepEqual(d,before);d.cadDuplo.limite2=49;assert.throws(()=>prepareCadSides(d),/faixa sem usinar/);
});
test('interno passante se inverte; interno parcial não é inventado nem apagado',async()=>{
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),d=drawing();d.internos1=[{tipo:'icone',a:30,b:20,c:100,id:'i'}];assert.deepEqual(createOppositeCadSide(d).internos2,[{tipo:'icone',a:20,b:30,c:100,id:'i-lado2'}]);d.internos1=[{tipo:'furo',a:10,b:20}];const before=structuredClone(d);assert.throws(()=>createOppositeCadSide(d),/parcial/);assert.deepEqual(d,before);
});
test('programas dos dois lados usam limites, ordem escolhida e arcos interpretáveis',async()=>{
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),{generate}=await import('../src/domain.mjs'),d=createOppositeCadSide(drawing());
 const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:64,lBruto:102,grip1:10,grip2:10,sobre1:1}},maq:C.DEFAULT_MAQ};
 for(const first of ['1','2']){const result=generate({...form,cadPrimeiro:{test:first}},[d],tools);assert.deepEqual(result.erros,[],JSON.stringify(result));assert.equal(result.lados.length,2);assert.equal(result.lados[Number(first)-1].ordem,1);for(const side of result.lados){assert.match(side.code,new RegExp('LADO.0'+side.id.slice(1)));const sim=Prog.interpretar(side.code);assert.deepEqual(sim.erros,[]);assert.ok(side.cena.protect.length>0)}}
});
test('limite continua sujeito à fixação e ao comprimento disponível fora da placa',async()=>{
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),{generate}=await import('../src/domain.mjs'),d=createOppositeCadSide(drawing());d.cadDuplo.limite1=95;
 const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:64,lBruto:102,grip1:10,grip2:10,sobre1:1}},maq:C.DEFAULT_MAQ};const result=generate(form,[d],tools);assert.ok(result.erros.some(m=>/placa|castanhas|livre/.test(m)),JSON.stringify(result));
});
test('perfil divergente ou comprimento inválido não libera sobreposição entre lados',async()=>{
 const {createOppositeCadSide,prepareCadSides}=await import('../src/cad-sides.mjs'),d=createOppositeCadSide(drawing());d.trechos2[0].path[1].b[1]+=1;assert.throws(()=>prepareCadSides(d),/não correspondem/);
});
test('Disco 7 preserva quatro arcos no desenho invertido e gera ambos os lados',async()=>{
 const fixture=require('./fixtures/disco-7-gap.json'),G=require('../public/engine/dxfgeometry.js'),P=require('../public/engine/dxfprofile.js'),geometry=structuredClone(fixture.geometry);G.repairEndpoints(geometry,fixture.ids);
 const profile=P.analyze({geometry,units:4},null,fixture.axis,'direita',new Set(fixture.ids)).nativeProfile;assert.equal(profile.ok,true,JSON.stringify(profile));
 const {createOppositeCadSide}=await import('../src/cad-sides.mjs'),{generate}=await import('../src/domain.mjs'),d=createOppositeCadSide({...drawing(),lPeca:profile.length,trechos1:[{id:'disco',tipo:'cadperfil',path:profile.path}]});
 assert.equal(d.trechos1[0].path.filter(s=>s.kind==='arc').length,4);assert.equal(d.trechos2[0].path.filter(s=>s.kind==='arc').length,4);
 for(const first of ['1','2']){const form={tipo:'peca_simples',desenhoSel:d.id,cadPrimeiro:{test:first},vals:{peca_simples:{dBruto:profile.radius*2+4,lBruto:profile.length+2,grip1:12,grip2:12,sobre1:1}},maq:C.DEFAULT_MAQ},result=generate(form,[d],tools);assert.deepEqual(result.erros,[],JSON.stringify(result));for(const side of result.lados)assert.deepEqual(Prog.interpretar(side.code).erros,[]);}
});
