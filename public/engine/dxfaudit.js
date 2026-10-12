/* Gate de segurança: dados CAD medidos vs perfil CNC selecionado.
   Não infere fixação nem converte raios, roscas e splines em retas. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();
 else root.CNCDXFAuditoria=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';
function num(x){return x==null||x===''?NaN:Number(x)}
function unique(arr){return [...new Set(arr)]}
function check(args){
 args=args||{};
 const ex=args.external,inside=args.internal,doc=args.doc,face=args.face,axis=num(args.axis),length=num(args.length);
 let problems=[];
 if(!doc||doc.units!==4)problems.push('DXF em unidade diferente de milímetros ou não informado.');
 if(!Number.isFinite(axis))problems.push('Eixo X0 não definido.');
 if(face!=='esquerda'&&face!=='direita')problems.push('Face Z0 não definida na preparação.');
 if(!(length>0))problems.push('Comprimento nominal não informado.');
 if(!ex||!ex.selected||!ex.selected.length)problems.push('Selecione ao menos uma cadeia externa.');
 if(ex&&ex.connection){
  if(ex.connection.components!==1)problems.push('Perfil externo com '+ex.connection.components+' cadeias desconectadas.');
  if(ex.connection.branches.length)problems.push('Perfil externo com bifurcações não resolvidas.');
  if(ex.connection.gaps.length!==2)problems.push('Perfil externo precisa ter duas extremidades abertas, não '+ex.connection.gaps.length+'.');
 }
 const groups=[['externo',ex],['interno',inside]];
 if(ex?.nativeProfile?.ok&&inside?.selected?.length){
  const points=inside.selected.flatMap(s=>s.kind==='line'?[s.a,s.b]:[]).filter(Boolean);
  const x0=face==='direita'?Math.max(...points.map(p=>p[0])):Math.min(...points.map(p=>p[0]));
  if(Math.abs(x0-ex.nativeProfile.sourceFace)>.001)problems.push('O perfil interno não começa na mesma face do contorno externo. Revise sua posição antes de converter.');
 }
 groups.forEach(([label,g])=>{
  if(!g||!g.selected||!g.selected.length)return;
  if(label==='externo'&&g.nativeProfile&&!g.nativeProfile.ok){problems.push(...g.nativeProfile.problems);return}
  if(g.connection&&g.connection.components!==1)problems.push('Perfil '+label+' tem partes desconectadas.');
  if(g.connection&&g.connection.branches&&g.connection.branches.length)problems.push('Perfil '+label+' possui ramificações não resolvidas.');
  if(g.connection&&g.connection.gaps&&g.connection.gaps.length!==2)problems.push('Perfil '+label+' não é um percurso aberto único de duas extremidades.');
  const native=label==='externo'&&g.nativeProfile?.ok;
  if(!native&&g.classified&&g.classified.some(t=>t.kind!=='cil'&&t.kind!=='cone'))
   problems.push('Perfil '+label+' contém arco, face/degrau ou curva ainda sem tradução CNC.');
  let intervals=native?[]:g.selected.map(s=>{
   let a=s.kind==='line'&&s.a?s.a[0]:null,b=s.kind==='line'&&s.b?s.b[0]:null;
   return a===null||b===null?null:{lo:Math.min(a,b),hi:Math.max(a,b),id:s.uid};
  }).filter(Boolean).sort((a,b)=>a.lo-b.lo);
  if(native&&length>0&&Math.abs(g.nativeProfile.length-length)>.01)problems.push('Comprimento geométrico superior '+g.nativeProfile.length.toFixed(3)+' mm diferente do comprimento nominal '+length.toFixed(3)+' mm. Use o comprimento do perfil.');
  for(let i=1;i<intervals.length;i++){
   const prev=intervals[i-1],now=intervals[i];
   if(now.lo<prev.hi-.16)problems.push('Sobreposição axial no perfil '+label+' perto de '+now.lo.toFixed(3)+' mm CAD.');
   else if(now.lo>prev.hi+.16)problems.push('Lacuna axial no perfil '+label+' de '+(now.lo-prev.hi).toFixed(3)+' mm.');
  }
  if(label==='externo'&&Number.isFinite(length)&&intervals.length){
   const span=Math.max(...intervals.map(t=>t.hi))-Math.min(...intervals.map(t=>t.lo));
   if(Math.abs(span-length)>.15)problems.push('Projeção axial externa '+span.toFixed(3)+' mm diferente do comprimento nominal '+length.toFixed(3)+' mm.');
  }
 });
 const native=(args.nativeDimensions||[]).filter(d=>d&&d.measure>0&&d.kind===0&&!d.diameter&&Math.abs(Math.sin(Number(d.angle||0)*Math.PI/180))<.15);
 if(native.length&&length>0&&!ex?.nativeProfile){
  const max=Math.max(...native.map(d=>d.measure));
  if(Math.abs(max-length)>.20)problems.push('Comprimento informado '+length.toFixed(3)+' mm difere da maior cota axial CAD '+max.toFixed(3)+' mm.');
 }
 let candidate=args.candidateSegments||[],chosen=new Set([...(ex?.selected||[]).map(s=>s.uid),...(inside?.selected||[]).map(s=>s.uid)]);
 const arcs=candidate.filter(s=>s.kind==='arc');
 if(arcs.length&&!ex?.nativeProfile){
  const missing=arcs.filter(s=>!chosen.has(s.uid));
  if(missing.length)problems.push(missing.length+' arco(s) CAD na seção não associados; confira cada raio/canto.');
  // mesmo um arco selecionado não é tradutível atualmente
  if(arcs.some(s=>chosen.has(s.uid)))problems.push('Raios CAD selecionados exigem conversão de canto antes de exportar.');
 }
 if((args.unsupportedCurves||0)>0&&!ex?.nativeProfile)problems.push('SPLINE/ELLIPSE CAD ainda sem tradução CNC.');
 if((args.threadNotes||0)>0)problems.push('Roscas/furos CAD identificados; confirmar operações próprias no editor.');
 return {ok:problems.length===0,problems:unique(problems)};
}
function preparation(args){
 const problems=unique([...check(args).problems,...(args?.external?.alerts||[]),...(args?.internal?.selected?.length?args.internal.alerts||[]:[]),...(args?.pendingEdit?['Edição de conexão ou extensão ainda pendente.']:[])]);
 const hint=p=>/milímetros|Unidade/.test(p)?'Exporte o DXF em milímetros no CAD e importe novamente.':/Eixo|eixo central/.test(p)?'Volte à etapa 1 e informe a coordenada do eixo X0.':/Face Z0|face Z0/.test(p)?'Escolha Z0 na esquerda ou na direita aqui na etapa 2, conforme a face voltada à ferramenta.':/Comprimento|comprimento nominal|Projeção axial/.test(p)?'Confira a cota e preencha o comprimento nesta etapa; se o contorno estiver correto, use Usar comprimento do perfil.':/Nenhuma entidade|ao menos uma cadeia/.test(p)?'Ative Externo e selecione a cadeia superior que representa a superfície da peça.':/bifurca|ramifica|Ramifica/.test(p)?'Desmarque ou apague as linhas auxiliares no encontro; o perfil precisa ser uma cadeia sem bifurcações.':/desconect|descontínuo|lacuna|pontas|extremidades|Lacuna/.test(p)?'Marque as cadeias faltantes. Para pontas próximas use Ligar falhas; para outras distâncias use Conectar linhas ou Estender linha. Duas pontas abertas são corretas; não feche o perfil.':/não começa na mesma face/.test(p)?'Revise a seleção interna e a face Z0; o interno deve começar na mesma face do externo.':/Roscas|furos CAD|sem tradução|SPLINE|ELLIPSE/.test(p)?'Revise essas operações em Revisar no editor da peça; conserve o rascunho até representar todos os detalhes.':/volta em Z/.test(p)?'Confira a face Z0 e remova linhas auxiliares que fazem o contorno voltar no eixo Z.':/pendente/.test(p)?'Termine a conexão/extensão ou cancele a seleção antes de continuar.':'Confira a seleção e as medidas. Use Desfazer edição para reverter o último ajuste ou revise no editor da peça.';
 return {ok:!problems.length,items:problems.map(problem=>({problem,hint:hint(problem)}))};
}
return {check,preparation};
});
