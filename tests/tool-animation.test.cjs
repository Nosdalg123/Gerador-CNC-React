const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const S=require('../public/engine/sim.js'),P=require('../public/engine/progsim.js'),C=require('../public/engine/core.js'),Setup=require('../public/engine/toolsetup.js');
test('croqui físico usa exatamente o mesmo inserto e corretor do corte para todos os tipos',async()=>{
 const {simulationToolParts,svgFerr}=await import('../src/assets/tool-drawing.mjs');
 for(const shape of [{kind:'rombo',ang:55,ap:93,raio:.8,tip:3},{kind:'interna',ang:80,ap:95,raio:1.2,tip:2},{kind:'rosca'},{kind:'roscaint'},{kind:'broca',largura:42},{kind:'canalext',largura:4.5},{kind:'canalint',largura:3}]){
  const before=S.toolShape(shape),parts=simulationToolParts(shape);assert.deepEqual(parts.ins,before.pts);assert.deepEqual(S.toolShape(shape),before);assert.ok(parts.hold.length>=4);assert.match(svgFerr(shape,{physical:true}),/montagem no plano XZ/);
 }
});
test('interna fica para o eixo e externa para fora, com o ponto programado em X/2 e Z',async()=>{
 const shape={kind:'interna',ang:80,raio:.8,tip:2},sim=new S.Sim({bruto:{d:100,z0:2,z1:-110},maq:C.DEFAULT_MAQ,tools:{'0606':shape},path:[],start:{x:60,z:-50}});
 const local=S.toolShape(shape),world=sim.toolPoly('0606',60,-50);assert.deepEqual(world,local.pts.map(p=>[-50+p[0],30+p[1]]));assert.ok(Math.max(...world.map(p=>p[1]))<30.03);assert.ok(Math.min(...world.map(p=>p[1]))<20);
 assert.ok(S.toolShape({kind:'rombo',ang:80,raio:.8,tip:3}).bb[2]>-.03);
});
test('duas geometrias internas não inventam uma associação pela posição antiga do banco',()=>{
 const tools=[{id:'a',tipo:'interna',t:'0606'},{id:'b',tipo:'interna',t:'0707'}],ref={codigo:'0606',sug:{tipo:'interna'}};
 assert.equal(Setup.programTool({ferr:{}},tools,ref),undefined);assert.equal(Setup.programTool({ferr:{'0606':'a'}},tools,ref),tools[0]);
});
test('worker bloqueia ferramenta de corte não associada e libera a montagem explícita correta',()=>{
 const messages=[],root=path.resolve(__dirname,'../public/engine'),context=vm.createContext({postMessage:m=>messages.push(m),structuredClone});context.importScripts=(...files)=>files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),context,{filename:f}));vm.runInContext(fs.readFileSync(path.join(root,'simulation-worker.js'),'utf8'),context);
 const input={text:'G21G90G40G99\nT0606(DESBASTE INTERNO)\nG97S1000M4\nG0X60Z2\nG1Z-20F.2\nM30',variables:'{}',maq:C.DEFAULT_MAQ,tools:[{id:'a',tipo:'interna'},{id:'b',tipo:'interna'}],state:{ferr:{},b:{}}};
 context.onmessage({data:{kind:'program',input}});let result=messages.at(-1);assert.equal(result.scene,null);assert.equal(result.toolMissing[0].code,'0606');assert.equal(result.toolMissing[0].type,'interna');assert.equal(result.result.erros.length,0);
 input.state.ferr['0606']='a';context.onmessage({data:{kind:'program',input}});result=messages.at(-1);assert.equal(result.toolMissing.length,0);assert.equal(result.scene.tools['0606'].kind,'interna');assert.equal(result.scene.tools['0606'].tip,2);
});
