import {prepareCadSides} from './cad-sides.mjs';
export const CNC=globalThis.CNC, Prog=globalThis.CNCProg, Sim=globalThis.CNCSim, Diag=globalThis.CNCDiag;
export function fieldsFor(type,stored={}) {return Object.fromEntries(CNC.GERADORES[type].campos.map(c=>[c.id,stored[c.id]??(Array.isArray(c.def)?structuredClone(c.def):c.def)]));}
export function numericFields(type,stored={}) {const fields=fieldsFor(type,stored);for(const c of CNC.GERADORES[type].campos){if(c.tipo==='trechos')continue;if(c.tipo==='select')fields[c.id]=String(fields[c.id]??'');else fields[c.id]=fields[c.id]===''?NaN:Number(fields[c.id]);}return fields;}
export function selectedDrawing(form,drawings){return Object.hasOwn(form,'desenhoSel')?drawings.find(d=>d.id===form.desenhoSel):drawings[0];}
export function programTool(state,tools,reference){if(Object.hasOwn(state.ferr||{},reference.codigo))return tools.find(t=>t.id===state.ferr[reference.codigo]);const matches=tools.filter(t=>CNC.tcode(t.t)===reference.codigo);return matches.find(t=>t.tipo===reference.sug?.tipo)||matches[0];}
export function programOrientation(state,reference,tool){const allowed=tool?.tipo==='encaixe'?['canal','canalext','canalint']:tool?.tipo==='rosca'?['rosca','roscaint']:[];const saved=state.orient?.[reference.codigo];return allowed.includes(saved)?saved:allowed.includes(reference.sug?.orient)?reference.sug.orient:allowed[0];}
export function generate(form,drawings,tools) {
  const type=CNC.GERADORES[form.tipo]?form.tipo:'matriz_solida',g=CNC.GERADORES[type],f=numericFields(type,form.vals?.[type]);
  let firstCad='1',dualCad=false;
  if(g.usaDesenho){let d=selectedDrawing(form,drawings);if(!d)return {erros:['Selecione um desenho salvo ou importe um desenho para gerar esta peça.'],avisos:[]};
    if(d.cadOrigem?.incompleto||d.cadOrigem?.verificado===false)return {erros:['Desenho DXF é um RASCUNHO INCOMPLETO. Conclua o perfil no editor e confirme a revisão completa do CAD antes de gerar.'],avisos:[]};
    if(d.lados==='2'&&d.cadDuplo?.modo==='invertido'){
      firstCad=form.cadPrimeiro?.[d.id]||d.cadDuplo.primeiro||'1';dualCad=true;
      try{d=prepareCadSides(d,firstCad,form.cadUsinagem?.[d.id])}catch(error){return {erros:[error.message],avisos:[]}}
      f.permiteSobrepor=true;
      if(firstCad==='2'){for(const prefix of ['grip','usin','sentE','sentI'])[f[prefix+'1'],f[prefix+'2']]=[f[prefix+'2'],f[prefix+'1']];f.brutoIntLado=f.brutoIntLado==='2'?'1':'2';}
    }
    Object.assign(f,{lPeca:Number(d.lPeca),lados:d.lados,desenhoNome:d.nome});for(const k of ['trechos1','trechos2','internos1','internos2'])f[k]=d[k];
    for(const side of ['1','2'])if(f['usin'+side]==='ambos'&&!f['trechos'+side].length&&f['internos'+side].length)f['usin'+side]='int';}
  f.pressao=form.pressao||'';
  const selection=form.toolByTipo?.[type]||{},selected={};
  for(const slot of g.ferramentas){let t=tools.find(x=>x.id===selection[slot.id]);if(!t&&!Object.hasOwn(selection,slot.id))t=tools.find(x=>slot.tipos.includes(x.tipo));
    selected[slot.id]=slot.id==='t1'&&t?{...t,...Object.fromEntries(Object.entries(form.over?.[type]||{}).filter(([,v])=>v!==''&&Number.isFinite(Number(v))).map(([k,v])=>[k,Number(v)]))}:t;}
  try{const result=g.gerar(f,selected,{maq:form.maq,autor:form.autor||'FERRAMENTARIA',data:form.dataManual||CNC.mesAno(),...(form.nomeManual&&form.nome?{nome:form.nome}:{})});
    if(dualCad&&firstCad==='2')for(const key of ['erros','avisos'])if(result[key])result[key]=result[key].map(m=>m.replace(/([Ll]ado )([12])/g,(_,prefix,n)=>prefix+(3-Number(n))));
    if(dualCad&&result.lados){result.lados=result.lados.map((l,i)=>{const actual=firstCad==='2'?2-i:i+1,order=i+1;return {...l,id:'l'+actual,titulo:'Lado '+actual,ordem:order,code:l.code?.replaceAll('LADO.0'+(i+1),'LADO.0'+actual),nome:l.nome?.replaceAll('LADO.0'+(i+1),'LADO.0'+actual),estrategia:['Lado '+actual+' · operação '+order+'; '+(order===1?'começa no bruto.':'vire a peça após a primeira operação.'),...l.estrategia.slice(1)]}}).sort((a,b)=>a.id.localeCompare(b.id));}
    return result;}
  catch(error){return {erros:['Não foi possível gerar: '+error.message],avisos:[]};}
}
export function drawingReference(d){if(Number(d.dRef)>0)return Number(d.dRef);const diameters=['trechos1','trechos2','internos1','internos2'].flatMap(k=>(d[k]||[]).filter(x=>['cil','cone','rosca','furo','icil','icone','irosca','icanal'].includes(x.tipo)).flatMap(x=>[Number(x.a)||0,x.tipo.includes('cone')?Number(x.b)||0:0]));const radii=['trechos1','trechos2'].flatMap(k=>(d[k]||[]).filter(t=>t.tipo==='cadperfil').flatMap(t=>{const info=globalThis.CNCPerfilCAD.validate(t.path);return info.ok?[2*info.radius]:[]}));return Math.max(60,...diameters,...radii)+4;}
export function drawingPreview(d,tools,side){
  const view=side?{...d,lados:'1',trechos1:d['trechos'+side]||[],internos1:d['internos'+side]||[],trechos2:[],internos2:[]}:d;
  const native=view.trechos1?.find(t=>t.tipo==='cadperfil');
  if(native){
    const cad=globalThis.CNCPerfilCAD,info=cad.validate(native.path);
    if(!info.ok)return {erros:info.problems,avisos:[]};
    const length=Number(view.lPeca),protect=[...native.path.flatMap((s,i)=>i?cad.sample(s,64).slice(1):cad.sample(s,64))];
    protect.push([protect.at(-1)[0],0],[0,0]);
    // A prévia é geométrica; o Gerador continua conferindo a região presa na placa.
    const holes=[],interiores=[];let z=0;
    for(const t of view.internos1||[]){if(t.tipo==='furo'){holes.push([[0,0],[0,Number(t.a)/2],[-Number(t.b),Number(t.a)/2],[-Number(t.b),0]]);continue}if(['icil','icone'].includes(t.tipo)){const end=z-Number(t.tipo==='icil'?t.b:t.c),r0=Number(t.a)/2,r1=t.tipo==='icil'?r0:Number(t.b)/2;const ip=[[z,r0],[end,r1]];interiores.push(ip);holes.push([[z,0],...ip,[end,0]]);z=end}}
    return {erros:Math.abs(length-info.length)>.01?['O comprimento informado difere do contorno CAD. Edite o perfil no CAD para alterar suas medidas.']:[],avisos:[],cena:{protect,holes,interiores,bruto:{d:drawingReference(view),z0:0,z1:-info.length}}};
  }
  const form={tipo:'peca_simples',desenhoSel:d.id,vals:{peca_simples:{dBruto:drawingReference(d),lBruto:Number(d.lPeca)+2,grip1:.01,grip2:.01,sobre1:1}},maq:{...CNC.DEFAULT_MAQ,grip:.01}};
  // A prévia geométrica também deve mostrar rascunhos ainda bloqueados para usinagem.
  // Usa ferramentas de referência sem alterar o banco ou o desenho do usuário.
  const previewDrawing={...view,cadOrigem:undefined},reference=(globalThis.CNC_SEED_TOOLS||tools).map((t,i)=>({...t,id:'preview-'+i}));
  const internals=[...(view.internos1||[]),...(view.internos2||[])],external=[...(view.trechos1||[]),...(view.trechos2||[])];
  const drill=internals.find(t=>t.tipo==='furo');for(const t of reference)if(t.tipo==='furacao'&&drill)t.diametro=Number(drill.a);
  const widths=[...external,...internals].filter(x=>['canal','icanal'].includes(x.tipo)&&Number(x.c)>0).map(x=>Number(x.c));if(widths.length)for(const t of reference)if(t.tipo==='encaixe')t.largura=Math.min(...widths);
  return generate(form,[previewDrawing],reference);
}
export function download(name,text,type='text/plain;charset=utf-8') {const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
export function downloadCode(r){download(r.nome||'PROGRAMA.txt',r.code.replace(/\r?\n/g,'\r\n')+'\r\n');}
export function errorDiagnostics(result,text){return Diag.diagnosticar(result,text,{});}
export const ELEMENTS={cil:['Cilindro',['Ø','Comprimento'],{a:40,b:20}],cone:['Cone',['Ø inicial','Ø final','Comprimento'],{a:40,b:60,c:10}],chanfro:['Chanfro',['Tamanho'],{a:1}],raio:['Raio',['Raio'],{a:1}],canal:['Canal externo',['Ø fundo','Posição Z','Largura'],{a:30,b:0,c:4.5,seq:true}],rosca:['Rosca externa',['Ø nominal','Comprimento','Passo'],{a:30,b:20,c:2}],furo:['Furo / broca',['Ø','Profundidade'],{a:18,b:30}],icil:['Cilindro interno',['Ø','Comprimento'],{a:24,b:30}],icone:['Cone interno',['Ø boca','Ø fundo','Comprimento'],{a:24,b:18,c:20}],ichanfro:['Chanfro interno',['Tamanho'],{a:1}],iraio:['Raio interno',['Raio'],{a:1}],icanal:['Canal interno',['Ø fundo','Posição Z','Largura'],{a:30,b:0,c:4.5,seq:true}],irosca:['Rosca interna',['Ø nominal','Comprimento','Passo'],{a:30,b:20,c:2}]};
export function corners(d,side,internal){const list=d['internos'+side]||[],pilot=Number(list.find(x=>x.tipo==='furo')?.a||0)/2;return internal?CNC.psCantosInt(list,pilot,drawingReference(d)/2):CNC.psCantos(d['trechos'+side]||[],drawingReference(d)/2);}
