/* Leitura e análise de material fora da thread da interface. */
importScripts('./core.js','./sim.js','./progsim.js','./diagnostico.js','./toolsetup.js');
let simulation=null;
function progress(status){postMessage({status});}
function frame(){const mat=simulation.mat.slice();postMessage({frame:{time:simulation.t,state:simulation.state(),mat}},[mat.buffer]);}
onmessage=({data})=>{
 try{
  const {kind,input}=data;
  if(kind==='program'){
   progress('Lendo o programa…');
   const vars=JSON.parse(input.variables||'{}');
   if(!vars||Array.isArray(vars)||typeof vars!=='object'||Object.entries(vars).some(([key,value])=>!/^\d+$/.test(key)||typeof value!=='number'||!Number.isFinite(value)))throw Error('Informe as variáveis como um objeto JSON de números finitos.');
   const result=CNCProg.interpretar(input.text||'',{maq:input.maq,variaveis:vars});let scene=null;
   const toolMissing=result.ferramentas.filter(f=>f.nCorte>0&&!CNCToolSetup.programGeometry(input.state,input.tools,f)).map(f=>({code:f.codigo,type:f.sug.tipo}));
   if(!result.erros.length&&!result.truncado&&result.moves.length){
    progress('Conferindo ferramentas e compensação…');
    const ferr=Object.fromEntries(result.todasFerr.map(f=>{const tool=CNCToolSetup.programGeometry(input.state,input.tools,f);return [f.codigo,{tool,orient:CNCToolSetup.programOrientation(input.state,f,tool)}];}));
    scene=CNCProg.montarCena(result,{...input.state.b,maq:input.maq,ferr});
   }
   const diagnostics=CNCDiag.diagnosticar(result,input.text||'',{extras:scene?.compAvisos||[]});
   const compensationMissing=scene?.compAvisos?.filter(a=>/não tem raio|sem compensação/.test(a.texto));
   postMessage({result,scene:compensationMissing?.length||toolMissing.length?null:scene,diagnostics,compensationMissing,toolMissing});
  }else if(kind==='simulation'){
   progress('Preparando a remoção de material…');
   const scene=input.generated?CNCProg.comDecodificado(CNCProg.comCompensacao(input.scene),input.code,input.scene.maq):input.scene;
   const compensationMissing=scene.compAvisos?.filter(a=>/não tem raio|sem compensação/.test(a.texto));
   if(compensationMissing?.length)throw Error(compensationMissing.map(a=>a.texto).join(' '));
   const cells=(Math.abs(scene.bruto.z1)+Math.abs(scene.bruto.z0)+100)*(Math.max(scene.bruto.d,scene.chuck?.rOut*2||0)+20)*2;
   if(cells>8000000)throw Error('Dimensões muito grandes para a malha de simulação. Confira o bruto.');
   simulation=new CNCSim.Sim(scene);
   progress('Analisando percurso e colisões…');
   const analysis=simulation.analyze();
   const meta={};for(const key of ['scene','rB','cs','zlo','zhi','rlo','rhi','nz','nr','shapes','segs','groups','total','chk'])meta[key]=simulation[key];
   const mat=simulation.mat.slice();postMessage({meta,analysis,frame:{time:0,state:simulation.state(),mat}},[mat.buffer]);
  }else if(kind==='seek'&&simulation){simulation.seek(data.time);frame();}
 }catch(error){postMessage({error:error.message||String(error)});}
};
