const test=require('node:test'),assert=require('node:assert/strict');
const P=require('../public/engine/progsim.js'),S=require('../public/engine/sim.js'),CNC=require('../public/engine/core.js'),Setup=require('../public/engine/toolsetup.js');
const profile='N100G0X40Z0\nG1Z-20\nN200X60Z-40',base='G21G90G40G99\nT0909\nG97S1000M3\nG0X70Z5\n';
const cut=(res)=>res.moves.filter(m=>m.label==='DESBASTE G73'&&m.t==='f');
test('G73 conserva três passes e sobremetal; P/Q não roda como acabamento implícito',()=>{
 const r=P.interpretar(base+'G73U4W2R3\nG73P100Q200U1W.5F.2\n'+profile+'\nM30');
 assert.deepEqual(r.erros,[]);assert.equal(cut(r).length,6);
 assert.deepEqual(cut(r).filter((_,i)=>i%2===0).map(m=>[m.x,m.z]),[[49,-17.5],[45,-18.5],[41,-19.5]]);
 assert.ok(!r.moves.some(m=>m.line===7||m.line===8));
 assert.equal(r.moves.at(-1).x,70);assert.equal(r.moves.at(-1).z,5);
 const sim=new S.Sim(P.montarCena(r,{}));assert.deepEqual(sim.groups.filter(g=>g.pass).map(g=>g.pass),[1,2,3]);
});
test('G73 sem G70 deixa material no sobremetal; G70 explícito remove-o',()=>{
 const code=base+'G73U4W2R3\nG73P100Q200U4W.5F.2\n'+profile+'\n';
 const tool={tipo:'externa',raio:0,angulo:80,rpm:1000,modo:'G97'};
 function remaining(text){const r=P.interpretar(text),scene=P.montarCena(r,{d:70,livre:60,grip:20,ferr:{'0909':{tool}}}),sim=new S.Sim(scene);sim.seek(sim.total);const i=Math.floor((-10-sim.zlo)/sim.cs),j=Math.floor((21-sim.rlo)/sim.cs);return sim.mat[j*sim.nz+i];}
 assert.equal(remaining(code+'M30'),1);assert.equal(remaining(code+'G70P100Q200F.2\nM30'),0);
});
test('G73 de um bloco usa I/K/D e não depende do primeiro bloco Fanuc',()=>{
 const r=P.interpretar(base+'G73I4K2D3P100Q200U1W.5F.2\n'+profile+'\nM30');assert.deepEqual(r.erros,[]);assert.equal(cut(r).length,6);assert.equal(cut(r).at(-1).x,61);
});
test('G73 sem quantidade conhecida ou com repetição absurda bloqueia em vez de inventar um único passe',()=>{
 for(const first of ['', 'G73U4W2R0\n','G73U4W2R1000000000\n']){
  const r=P.interpretar(base+first+'G73P100Q200U1W.5F.2\n'+profile+'\nM30');assert.ok(r.erros.length);assert.equal(cut(r).length,0);
 }
});

test('FANUC 0i-F Plus arredonda o R decimal para o número de repetições',()=>{
 const r=P.interpretar(base+'G73U4W2R2.5\nG73P100Q200U1W.5F.2\n'+profile+'\nM30');
 assert.deepEqual(r.erros,[]);assert.equal(cut(r).length,6);assert.equal(cut(r).at(-1).passes,3);
});
test('geometria do banco não fixa T; posição e corretor ficam no trabalho',async()=>{
 const t={id:'w',nome:'W externo',tipo:'externa',raio:.8,t:'0101'},ref={codigo:'0909',sug:{tipo:'externa'}};
 const state={ferr:{'0909':'w'},setup:{'0909':{radius:1.2,tip:3}}};
 assert.equal(Setup.programTool(state,[t],ref),t);const geometry=Setup.programGeometry(state,[t],ref);
 assert.equal(geometry.t,'0909');assert.equal(geometry.raio,1.2);assert.equal(t.t,'0101');assert.equal(t.raio,.8);
 assert.equal(Setup.composeCode('9','12'),'0912');assert.deepEqual(Setup.splitCode('0912'),{code:'0912',position:'09',offset:'12'});
 globalThis.CNC=CNC;const {generate}=await import('../src/domain.mjs');
 const bank=[{id:'w',nome:'W',tipo:'externa',raio:.8,angulo:80,apSuporte:95,vc:300,rpm:2000,modo:'G96',sentido:4,avDesb:.3,avAcab:.15,incFace:1,incTorn:2,acabFace:0,acabTorn:0}];
 const r=generate({tipo:'matriz_solida',maq:CNC.DEFAULT_MAQ,toolSetupByTipo:{matriz_solida:{t1:{position:'9',offset:'12'}}}},[],bank);
 assert.deepEqual(r.erros,[]);assert.match(r.code,/#101=0912/);assert.equal(bank[0].t,undefined);
});
test('ponta do corretor define o vetor da ponta imaginária independentemente do suporte',()=>{
 const ext=S.toolShape({kind:'rombo',raio:.8,ang:55,ap:93,tip:3});assert.deepEqual(ext.nose,[.8,.8]);
 const inside=S.toolShape({kind:'interna',raio:.8,ang:80,ap:95,tip:2});assert.deepEqual(inside.nose,[.8,-.8]);
});
test('G42 desloca o cone pela normal em raio, com X em diâmetro; G40 preserva o ponto final',()=>{
 const code=base+'G42G0X30Z5\nG1Z0F.2\nX50Z-10\nZ-30\nG40G0X80Z5\nM30';
 const r=P.interpretar(code),tool={tipo:'externa',raio:.8,angulo:55,apSuporte:93,tip:3,rpm:1000,modo:'G97'};
 const s=P.montarCena(r,{ferr:{'0909':{tool}}});const points=s.path.filter(m=>m.line===6);
 assert.ok(points.length);const original=r.moves.find(m=>m.line===6);
 assert.ok(points.some(m=>Math.abs(m.x-original.x)>0.05||Math.abs(m.z-original.z)>0.05));
 assert.equal(s.path.at(-1).x,80);assert.equal(s.path.at(-1).z,5);assert.deepEqual(s.programmedPath,r.moves);
 assert.ok(s.path.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.z)));assert.deepEqual(s.compAvisos,[]);
});
