/* Fluxo CAD DXF: a fonte CAD permanece original; o perfil CNC só nasce da seleção
   confirmada de entidades geometricamente representáveis. Sem exportar curvas omitidas. */
(function(root){
'use strict';
const $=q=>document.querySelector(q),DX=root.CNCDXF,P=root.CNCDXFPerfil,E=root.CNCDXFEdicao,G=root.CNCDXFGeometria;
let doc=null,sourceDoc=null,rect=null,axis=NaN,suggest=null,active=false,start=null,zoom=1,fileName='',
 selected={externo:new Set(),interno:new Set()},chainInfo=null,hidden=new Set(),undo=[],pendingExtension=null,pendingConnection=null,
 editCount=0,dragRect=null,projDrag=null,skipProjectedClick=false,projPan=null,camera={x:0,y:0,w:900,h:480},
 activeMode='',lastProfile='externo',step=1,corrections=[],noticeTimer=null,noticeIndex=0,noticeHover=0,editingDrawing=null,editingSide='1',saveSide='1',restoredInternals=null;
const KEY='cnc_dxf_rascunhos_v1';
const val=id=>$(id).value;
const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const status=(s,bad)=>{$('#dxfStatus').textContent=s;$('#dxfStatus').style.color=bad?'#b23927':''};
const checked=()=>$('#dxfChecked').checked;
const clone=obj=>JSON.parse(JSON.stringify(obj));
const mode=()=>activeMode;
function updateSteps(){document.querySelectorAll('[data-dxf-go]').forEach(b=>{const n=Number(b.dataset.dxfGo);b.disabled=n===2?(!doc||!rect||val('#dxfAxis')===''||!Number.isFinite(Number(val('#dxfAxis')))):n===3?!doc:false})}
function setStep(next){
 updateSteps();const button=$('.dxf-steps [data-dxf-go="'+next+'"]');if(!button||button.disabled){status('Abra um DXF, delimite a vista e indique o eixo na etapa 1.',true);return}
 const preparation=next===3?checkPreparation():null;
 if(preparation&&!preparation.ok){next=$('.dxf-steps [data-dxf-go="2"]').disabled?1:2;status('Não é possível avançar: resolva as pendências de preparação indicadas na etapa 2.',true);}
 step=next;document.querySelectorAll('[data-dxf-step]').forEach(s=>s.hidden=Number(s.dataset.dxfStep)!==step);
 document.querySelectorAll('.dxf-steps [data-dxf-go]').forEach(b=>{if(Number(b.dataset.dxfGo)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current')});
 applyCamera();
 if(step===3)renderProjection();
 if(preparation){showPreparation(preparation);if(!preparation.ok&&step===2){$('#dxfPending').scrollIntoView({block:'center'});$('#dxfPending').focus({preventScroll:true});}}
}
function checkPreparation(){
 const external=analyse('externo'),internal=analyse('interno'),a=val('#dxfAxis')===''?NaN:Number(val('#dxfAxis'));
 const candidate=external?.candidate||[],src=doc&&rect?DX.cut(doc.geometry,rect):[];
 const notes=doc&&rect?DX.annotations(doc.entities,rect,26).filter(q=>q.at?.[1]>=a&&/\b(?:M\s*\d+|ROSCA|FURO|THREAD)\b/i.test(q.text||'')):[];
 return root.CNCDXFAuditoria.preparation({doc,axis:a,face:val('#dxfFace'),length:val('#dxfLength'),external,internal,nativeDimensions:dimsForRect(),candidateSegments:candidate,unsupportedCurves:src.filter(q=>(q.type==='SPLINE'||q.type==='ELLIPSE')&&DX.bounds([q])?.y2>=a).length,threadNotes:notes.length+dimsForRect().filter(d=>d.position?.[1]>=a&&/^[Mm]\s*\d+/.test(String(d.text||''))).length,pendingEdit:!!pendingConnection});
}
function showPreparation(result){
 const host=$('#dxfPending');host.replaceChildren();host.hidden=result.ok;if(result.ok)return;
 const title=document.createElement('strong');title.textContent='Pendências para concluir a etapa 2';host.appendChild(title);
 const list=document.createElement('ol');for(const item of result.items){const li=document.createElement('li'),p=document.createElement('div'),hint=document.createElement('div');p.textContent=item.problem;hint.textContent='Como corrigir: '+item.hint;li.append(p,hint);list.appendChild(li);}host.appendChild(list);
}
document.querySelectorAll('[data-dxf-go]').forEach(b=>b.onclick=()=>setStep(Number(b.dataset.dxfGo)));
function setMode(next){
 activeMode=next;if(['externo','interno'].includes(next))lastProfile=next;resetEditing();
 document.querySelectorAll('[data-dxf-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.dxfMode===next)));
 $('#dxfPanMode').checked=false;projected.classList.remove('pan-ready');
 $('#dxfExtendControls').hidden=next!=='estender';$('#dxfConnectControls').hidden=next!=='conectar';projected.classList.toggle('box-deleting',next==='quadro');
 const hints={externo:'Clique nas linhas superiores para marcar ou desmarcar o perfil externo.',interno:'Clique nas linhas superiores para marcar ou desmarcar o perfil interno.',remover:'Clique nas linhas ou cadeias para desmarcar o perfil.',apagar:'Clique na linha a apagar da cópia de trabalho.',quadro:'Arraste um retângulo sobre as linhas a apagar.',quebrar:'Clique no elemento para quebrar nos cruzamentos, inclusive com o eixo central.',estender:'Clique numa linha e escolha o modo e a extremidade da extensão.',conectar:'Clique em duas retas ou arcos para ajustar as extremidades até o encontro. Folgas sem interseção menores que 0,2 mm recebem uma ligação reta curta.'};
 $('#dxfToolHint').textContent=hints[next]||'Nenhuma função ativa. Clique nas cadeias para selecionar ou escolha uma função.';
}
function resetConfirm(){$('#dxfChecked').checked=false;$('#dxfSaveCNC').disabled=true;$('#dxfSaved').textContent=''}
function remember(){
 if(!doc)return;
 undo.push({doc:clone(doc),hidden:[...hidden],externo:[...selected.externo],interno:[...selected.interno],editCount,corrections:clone(corrections)});
 if(undo.length>25)undo.shift();$('#dxfUndo').disabled=false;
}
function markEdited(changes=[]){clearCorrectionNotice();corrections=clone(changes);editCount++;resetConfirm();renderProjection();if(changes.length)showCorrectionNotice(1)}
function editOptions(){return {axis:val('#dxfAxis')===''?NaN:Number(val('#dxfAxis')),rect,hidden}}
function resetEditing(){
 pendingExtension=null;pendingConnection=null;
 $('#dxfExtendSelected').textContent='Clique numa linha reta para selecionar.';
 $('#dxfConnectHint').textContent='Clique na primeira reta ou arco e depois no segundo. As extremidades serão ajustadas até o encontro.';
}
function applyGeometry(result){
 const before={externo:new Set(selected.externo),interno:new Set(selected.interno)};
 const remap=set=>new Set([...set].flatMap(id=>result.remap[id]??[id]));
 selected.externo=remap(selected.externo);selected.interno=remap(selected.interno);hidden=remap(hidden);
 for(const added of result.added||[])for(const profile of ['externo','interno'])if(added.sources.every(id=>before[profile].has(id)))selected[profile].add(added.uid);
 doc.count=doc.geometry.length;
}
function failedEdit(result){undo.pop();$('#dxfUndo').disabled=!undo.length;status(result.reason,true)}
function fitCamera(){camera={x:0,y:0,w:900,h:480};applyCamera()}
function applyCamera(){const svg=$('#dxfProjected svg');if(svg)svg.setAttribute('viewBox',[camera.x,camera.y,camera.w,camera.h].join(' '));$('#dxfZoomLevel').textContent=Math.round(900/camera.w*100)+'%';positionCorrectionNotice()}
function clearCorrectionNotice(){clearTimeout(noticeTimer);noticeTimer=null;noticeIndex=0;$('#dxfCorrectionToast')?.remove();$('#dxfCorrectionArrow')?.remove()}
function positionCorrectionNotice(){
 const toast=$('#dxfCorrectionToast'),arrow=$('#dxfCorrectionArrow'),circle=$('#dxfProjected [data-cad-correction="'+noticeIndex+'"] circle'),wrap=projected?.parentElement;
 if(!toast||!arrow||!circle||!wrap)return;
 const b=wrap.getBoundingClientRect(),c=circle.getBoundingClientRect(),x=c.x+c.width/2-b.x,y=c.y+c.height/2-b.y,w=toast.offsetWidth,h=toast.offsetHeight;
 const left=Math.max(8,Math.min(b.width-w-8,x+35)),top=Math.max(8,Math.min(b.height-h-8,y>100?y-h-30:y+30));
 toast.style.left=left+'px';toast.style.top=top+'px';arrow.setAttribute('viewBox','0 0 '+b.width+' '+b.height);arrow.lastElementChild.setAttribute('d','M'+(left+w/2)+','+(y>100?top+h:top)+'L'+x+','+y);
}
function showCorrectionNotice(index){
 const circle=$('#dxfProjected [data-cad-correction="'+index+'"] circle');if(!circle)return;
 clearCorrectionNotice();noticeIndex=index;const c=corrections[index-1],wrap=projected.parentElement;
 const toast=document.createElement('div');toast.id='dxfCorrectionToast';toast.className='dxf-correction-toast';toast.setAttribute('role','status');toast.textContent=c?.kind==='bridge'?'Ligação curta criada entre as pontas. O círculo marca a conexão corrigida.':'Conexão ajustada entre linhas/arcos. O círculo marca o encontro corrigido; verde indica a correção.';wrap.appendChild(toast);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.id='dxfCorrectionArrow';svg.classList.add('dxf-correction-arrow');svg.innerHTML='<defs><marker id="dxfToastArrowhead" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0L7,3.5L0,7Z" fill="#147c59"/></marker></defs><path fill="none" stroke="#147c59" stroke-width="2" marker-end="url(#dxfToastArrowhead)"/>';wrap.appendChild(svg);
 positionCorrectionNotice();noticeTimer=setTimeout(clearCorrectionNotice,3000);
}
function inspectCorrection(evt){
 const circle=[...projected.querySelectorAll('[data-cad-correction] circle')].find(el=>{const b=el.getBoundingClientRect();return Math.hypot(evt.clientX-b.x-b.width/2,evt.clientY-b.y-b.height/2)<=Math.max(12,b.width/2)}),index=Number(circle?.parentElement.dataset.cadCorrection)||0;
 if(index&&index!==noticeHover)showCorrectionNotice(index);noticeHover=index;
}
function zoomCamera(factor,anchor){
 const scale=Math.max(.25,Math.min(20,900/camera.w*factor)),width=900/scale,height=480/scale;
 const p=anchor||{x:camera.x+camera.w/2,y:camera.y+camera.h/2};
 camera={x:p.x-(p.x-camera.x)/camera.w*width,y:p.y-(p.y-camera.y)/camera.h*height,w:width,h:height};applyCamera();
}
function removeLine(id){
 if(hidden.has(id))return;
 remember();hidden.add(id);selected.externo.delete(id);selected.interno.delete(id);
 if(pendingExtension===id)pendingExtension=null;
 markEdited();
}
function updateZ0(face){
 resetEditing();
 $('#dxfFace').value=face;
 for(const [name,f] of [['dxfZ0Left','esquerda'],['dxfZ0Right','direita'],['dxfZ0Pending','']])
  $('#'+name).setAttribute('aria-pressed',String(f===face));
 $('#dxfZ0Hint').textContent=face?'Z0 na face '+face+' (confirmar na preparação e simulação).':
  'Z0 pendente — permitido salvar rascunho, CNC bloqueado.';
 resetConfirm();renderProjection();
}
function draftList(){return root.CNCDXFDrafts.get()}
function refreshDrafts(){
 let ls=draftList(),s=$('#dxfDraftList');s.replaceChildren();
 ls.forEach((d,i)=>{let o=document.createElement('option');o.value=String(i);o.textContent=d.nome+' · '+(d.data||'');s.appendChild(o)});
 if(!ls.length){let o=document.createElement('option');o.value='';o.textContent='(nenhum rascunho)';s.appendChild(o)}
}
function viewPoint(evt,svg){
 // Inclui preserveAspectRatio, margens, escala CSS, zoom e translação da câmera.
 const point=svg.createSVGPoint();point.x=evt.clientX;point.y=evt.clientY;
 return point.matrixTransform(svg.getScreenCTM().inverse());
}
function drawingPoint(pt,b){
 const scale=Math.min(840/Math.max(1,b.width),420/Math.max(1,b.height));
 return [(pt.x-30)/scale+b.x1,(480-30-pt.y)/scale+b.y1];
}
function screenPt(pt,b){
 const scale=Math.min(840/Math.max(1,b.width),420/Math.max(1,b.height));
 return [30+(pt[0]-b.x1)*scale,480-30-(pt[1]-b.y1)*scale];
}
function renderSource(){
 if(!doc)return;
 const base=sourceDoc||doc,b=DX.bounds(base.geometry),host=$('#dxfSource');host.innerHTML=P.svg(base,null);
 let svg=host.querySelector('svg');svg.style.width=zoom*100+'%';svg.style.maxWidth='none';
 if(rect&&b){
  let a=screenPt([rect.x1,rect.y1],b),c=screenPt([rect.x2,rect.y2],b);
  let box=document.createElementNS('http://www.w3.org/2000/svg','rect');
  box.setAttribute('x',Math.min(a[0],c[0]));box.setAttribute('y',Math.min(a[1],c[1]));
  box.setAttribute('width',Math.abs(a[0]-c[0]));box.setAttribute('height',Math.abs(a[1]-c[1]));
  box.setAttribute('fill','#2782db');box.setAttribute('fill-opacity','.10');
  box.setAttribute('stroke','#e07818');box.setAttribute('stroke-width','2.2');box.setAttribute('stroke-dasharray','7 4');box.style.pointerEvents='none';
  svg.appendChild(box);
 }
}
function dimsForRect(){return sourceDoc&&rect?DX.nativeCotas(sourceDoc.dimensions,rect):[]}
function renderMeasures(){
 if(!doc)return;
 // As cotas continuam na origem e na auditoria; dispensam um painel de listagem.
 const dims=dimsForRect();
 let best=dims.filter(d=>d.measure>0&&d.kind===0&&!d.diameter&&Math.abs(Math.sin(d.angle*Math.PI/180))<.2).sort((a,b)=>b.measure-a.measure)[0];
 if(best&&!val('#dxfLength'))$('#dxfLength').value=Number(best.measure.toFixed(3));
}
function analyse(mode){
 if(!doc||!rect)return null;
 let a=Number(val('#dxfAxis'));
 if(val('#dxfAxis')==='')a=NaN;
 return P.analyze(doc,rect,a,val('#dxfFace'),selected[mode],hidden);
}
function drawChains(){
 const host=$('#dxfChains');host.replaceChildren();chainInfo=null;
 if(!doc||!rect||val('#dxfAxis')===''){host.textContent='Selecione a vista e indique o eixo X0 para encontrar as cadeias.';return}
 const y=Number(val('#dxfAxis'));if(!Number.isFinite(y))return;
 const seg=P.segments(doc.geometry,rect,hidden).filter(s=>P.above(s,y));
 chainInfo=root.CNCDXFCadeias.build(seg,{axis:y,tol:0.001});
 const info=document.createElement('p');info.className='note';
 info.textContent=chainInfo.chains.length+' cadeias · '+chainInfo.bifurcations.length+' bifurcações · '+chainInfo.tips.length+' pontas abertas · tolerância 0,001 mm.';
 host.appendChild(info);
 chainInfo.chains.slice(0,32).forEach((c,i)=>{
  const b=document.createElement('button');b.type='button';b.className='btn sm';
  b.textContent=(i+1)+'. '+c.count+' elementos · '+fmt(c.spanX)+' mm Z · '+c.arcCount+' arcos'+(c.branchEnd?' · bifurcação':'');
  const isChosen=c.ids.every(id=>selected.externo.has(id)||selected.interno.has(id));
  if(isChosen)b.classList.add('chosen');b.setAttribute('aria-pressed',String(isChosen));
  b.onclick=function(){
   const target=mode()==='interno'?'interno':'externo',remove=mode()==='remover'||c.ids.every(id=>selected[target].has(id));
   remember();setMode(remove&&mode()==='remover'?'remover':target);
   c.ids.forEach(id=>{
    selected.externo.delete(id);selected.interno.delete(id);
    if(!remove)selected[target].add(id);
   });
   resetConfirm();renderProjection();
   status('Cadeia '+(i+1)+(remove?' desmarcada.':' marcada como '+target+'. Confira o destaque no desenho.'));
  };
  host.appendChild(b);
 });
 if(chainInfo.chains.length>32){const p=document.createElement('p');p.className='note';p.textContent='Outras cadeias estão disponíveis por clique nas linhas.';host.appendChild(p)}
}
function renderProjection(){
 if(!doc)return;
 let host=$('#dxfProjected');
 let all=new Set([...selected.externo,...selected.interno]),a=Number(val('#dxfAxis')),none=val('#dxfAxis')==='';
 if(none)a=NaN;
 axis=a;
 let cand=P.analyze(doc,rect,a,val('#dxfFace'),new Set(),hidden).candidate;
 const picture=P.svg(doc,rect,{axis:a,face:val('#dxfFace'),selected:all,hidden,editing:new Set([pendingExtension,pendingConnection].filter(Boolean)),candidate:new Set(cand.map(s=>s.uid)),corrected:new Set(corrections.map(c=>c.uid)),corrections});
 host.innerHTML=picture;
 applyCamera();
 drawChains();
 const e=analyse('externo'),i=analyse('interno'),warn=$('#dxfWarnings');
 updateSteps();
 const target=lastProfile==='interno'?i:e,connections=G.endpointConnections(doc.geometry,target?.selected.map(s=>s.uid)||[],{...editOptions(),tolerance:.2,strictLimit:true,allowArcs:true});
 $('#dxfRepair').disabled=!connections.ok||!connections.pairs.some(p=>p.repairable);
 const advice=[];
 if(!e?.selected.length)advice.push('Selecione as cadeias do contorno externo ou ative Externo e marque as linhas superiores.');
 if(connections.ok&&connections.pairs.some(p=>p.repairable&&p.d>.001))advice.push('Há pontas separadas por menos de 0,2 mm. Use Ligar falhas; as linhas ajustadas ficarão verdes e os encontros serão numerados.');
 if(e?.connection.components>1)advice.push('Marque todas as cadeias que pertencem ao contorno. Se a distância for maior ou igual a 0,2 mm, use Estender linha ou Conectar linhas.');
 if(e?.connection.branches.length||connections.ambiguous?.length)advice.push('Existem encontros com mais de uma possibilidade. Desmarque ou apague as linhas auxiliares; a correção automática mantém esses encontros intactos.');
 if(connections.pairs?.some(p=>p.a.s.kind==='arc'&&p.b.s.kind==='arc'&&p.repairable))advice.push('Ligar falhas também conecta arcos: ajusta extremidades no círculo original ou cria uma ligação reta curta quando não existe interseção. As correções ficam verdes; centros e raios são preservados.');
 if(e?.nativeProfile.problems?.some(p=>/volta em Z/.test(p)))advice.push('Confira a face Z0 e remova retornos do contorno na etapa 2.');
 $('#dxfSuggestions').textContent=advice.join('\n');$('#dxfSuggestions').hidden=!advice.length;
 $('#dxfCorrectionInfo').hidden=!corrections.length;
 $('#dxfCorrectionInfo').textContent=corrections.length?'Última correção — linhas/arcos verdes e pontos numerados:\n'+corrections.map((c,j)=>(j+1)+'. '+c.uid+' ('+c.end+'): '+c.distance.toFixed(6).replace('.',',')+' mm; '+(c.kind==='bridge'?'ligação reta curta criada até ':'encontro com ')+c.anchor+'.').join('\n')+'\nCentros e raios preservados. Confira as cotas novamente; Desfazer edição restaura o estado anterior.':'';
 if(!e){warn.textContent='Selecione a seção longitudinal do DXF. A geometria original é exibida sem conversão inventada.';$('#dxfSaveCNC').disabled=true;return}
 const issues=e.alerts.concat(i.selected.length?i.alerts.filter(t=>!t.includes('Nenhuma entidade')):[]);
 const src=DX.cut(doc.geometry,rect),special=src.filter(q=>(q.type==='SPLINE'||q.type==='ELLIPSE')&&DX.bounds([q])?.y2>=a);
 const notes=DX.annotations(doc.entities,rect,26).filter(q=>q.at?.[1]>=a&&/\b(?:M\s*\d+|ROSCA|FURO|THREAD)\b/i.test(q.text||''));
 const dimNotes=dimsForRect().filter(d=>d.position?.[1]>=a&&/^[Mm]\s*\d+/.test(String(d.text||'')));
 if(notes.length||dimNotes.length)issues.push('Roscas/furos CAD identificados em '+(notes.length+dimNotes.length)+' anotações; confirme operações e perfis na revisão manual.');
 const more=root.CNCDXFAuditoria.check({
  doc,axis:a,face:val('#dxfFace'),length:val('#dxfLength'),external:e,internal:i,
  nativeDimensions:dimsForRect(),candidateSegments:cand,
  unsupportedCurves:special.length,threadNotes:notes.length+dimNotes.length
 });
 more.problems.forEach(problem=>{if(!issues.includes(problem))issues.push(problem)});
  let out=issues.length?issues.map((t,k)=>(k+1)+'. '+t).join('\n'):'Perfil selecionado sem advertências topológicas básicas. Conferir todos os detalhes, furos e fixação.';
 warn.textContent=out;warn.style.whiteSpace='pre-line';
 warn.textContent=issues.length?issues.map((t,k)=>(k+1)+'. '+t).join('\n'):'Meia seção superior válida: cadeia contínua, arcos e faces preservados. A metade inferior não participa. Confirme as cotas e a orientação para salvar.';
 if(hidden.size||editCount)warn.textContent+='\nCópia editada: '+hidden.size+' elementos ocultados, '+editCount+' edições. Confira o perfil superior atualizado.';
 $('#dxfSaveSummary').textContent=warn.textContent;
 const internalOK=!i.selected.length||i.classified.every(t=>t.kind==='cil'||t.kind==='cone');
 $('#dxfSaveCNC').disabled=!(checked()&&!issues.length&&e.canExport&&internalOK&&doc.units===4&&val('#dxfNome').trim());
 if(step===3&&!renderSaveSides())$('#dxfSaveCNC').disabled=true;
 if(!$('#dxfPending').hidden)showPreparation(checkPreparation());
}
function saveData(draftId){
 const e=analyse('externo'),i=analyse('interno');if(!e?.nativeProfile?.ok)throw Error('Conclua o perfil superior na etapa 2.');
 const items=[{tipo:'cadperfil',side:'1',path:clone(e.nativeProfile.path)}].concat(i?.selected.length?toItems('interno',i,val('#dxfFace')):(restoredInternals||[]).map(t=>({...clone(t),side:'1'})));
 return {nome:val('#dxfNome').trim(),lPeca:Number(val('#dxfLength')),dRef:Math.ceil(2*e.nativeProfile.radius+4),items,cadSide:editingSide,editingDrawing:editingDrawing?clone(editingDrawing):undefined,
  ...($('#dxfSaveTwoSides').checked?{cadDuplo:clone(editingDrawing?.cadDuplo||{modo:'invertido',primeiro:'1'})}:{}),
  cadOrigem:{arquivo:fileName,unidade:doc.unitName,faceZ0:val('#dxfFace'),eixoCAD:axis,verificado:true,incompleto:false,nativo:true,draftId,draftSide:editingSide,alteradoCAD:editCount>0,segmentosExcluidos:hidden.size,entidadesSelecionadas:e.selected.length+(i?.selected.length||0)}};
}
function renderSaveSides(){
 let views={},problem='';const api=root.CNCDesenhos;
 try{const data=saveData();try{views=api.previewSides({...data,cadDuplo:data.cadDuplo||{modo:'invertido',primeiro:'1'}})}catch(error){problem=error.message;views=api.previewSides({...data,cadDuplo:undefined})}}
 catch(error){problem=error.message}
 if(!views[saveSide])saveSide='1';
 document.querySelectorAll('[data-dxf-save-side]').forEach(b=>{const s=b.dataset.dxfSaveSide;b.disabled=!views[s];b.setAttribute('aria-pressed',String(s===saveSide));$('[data-dxf-side-thumbnail="'+s+'"]').innerHTML=views[s]?.thumbnail||''});
 $('#dxfSavePreview').innerHTML=views[saveSide]?.svg||'';
 $('#dxfSaveSideHint').textContent='Visualizando lado '+saveSide+' · perfil completo. '+($('#dxfSaveTwoSides').checked?'Os dois lados ficarão gravados no desenho.':'Somente o contorno atual será salvo. Marque a opção abaixo para gravar os dois lados.')+' Defina quanto usinar no Gerador de código.';
 $('#dxfSideError').hidden=!problem;$('#dxfSideError').textContent=problem?'Não foi possível gerar o lado 2 automaticamente: '+problem:'';
 return !!views['1']&&(!$('#dxfSaveTwoSides').checked||!!views['2']);
}
document.querySelectorAll('[data-dxf-save-side]').forEach(b=>b.onclick=()=>{saveSide=b.dataset.dxfSaveSide;renderSaveSides()});
$('#dxfGenerateSide2').onclick=()=>{$('#dxfSaveTwoSides').checked=true;saveSide='2';resetConfirm();renderProjection()};
$('#dxfSaveTwoSides').onchange=()=>{resetConfirm();renderProjection()};
function autoRecognize(){
 if(!doc||!rect||val('#dxfAxis')==='')return;
 const result=E.autoSelect(doc,rect,Number(val('#dxfAxis')),hidden);
 selected.externo=new Set(result.externo);selected.interno=new Set(result.interno);
 resetConfirm();renderProjection();
 status(result.reason+(result.chains?' · '+result.chains.bifurcations.length+' bifurcações identificadas.':''));
}
function view(rectangle){
 rect=rectangle;selected.externo.clear();selected.interno.clear();chainInfo=null;
 active=false;start=null;resetEditing();fitCamera();resetConfirm();renderSource();renderMeasures();renderProjection();
 if(rect&&val('#dxfAxis')!=='')autoRecognize();
}
function suggestView(){
 if(!doc)return;
 suggest=P.sectionSuggestion(doc);
 if(suggest){
  if(!val('#dxfAxis'))$('#dxfAxis').value=suggest.axis.toFixed(5);
  view(suggest.rect);
  status('Vista lateral sugerida pelas circunferências concêntricas. Confira o recorte e defina a face Z0.');
 }else status('Não encontrei vista lateral com confiança. Use Delimitar outra vista e indique o eixo manualmente.',true);
}
$('#dxfFile').onchange=async function(){
 let f=this.files[0];if(!f)return;
 if(!/\.dxf$/i.test(f.name)){status('Selecione DXF ASCII, não DWG/PDF.',true);return}
 if(f.size>25e6){status('DXF acima de 25 MB. Simplifique ou exporte só a vista de torneamento.',true);return}
 try{
  status('Lendo arquivo CAD '+f.name+'... aguarde a reconstrução das entidades vetoriais.');
  await new Promise(resolve=>root.requestAnimationFrame?root.requestAnimationFrame(()=>resolve()):resolve());
  let bytes=await f.arrayBuffer(),text=new TextDecoder('windows-1252').decode(bytes);
  status('Analisando entidades CAD, cotas e vistas do arquivo...');
  await new Promise(resolve=>root.requestAnimationFrame?root.requestAnimationFrame(()=>resolve()):resolve());
  clearCorrectionNotice();editingDrawing=null;editingSide='1';saveSide='1';restoredInternals=null;$('#dxfSaveTwoSides').checked=true;doc=DX.read(text);sourceDoc=clone(doc);fileName=f.name;rect=null;suggest=null;axis=NaN;zoom=1;active=false;
  fitCamera();$('#dxfPanMode').checked=false;
  hidden.clear();undo=[];corrections=[];setMode('');
  const cleanup=G.dedupeGeometry(doc.geometry);doc.count=doc.geometry.length;editCount=cleanup.removed.length?1:0;
  $('#dxfUndo').disabled=true;$('#dxfRestore').disabled=false;
  $('#dxfNome').value=f.name.replace(/\.dxf$/i,'');$('#dxfLength').value='';$('#dxfAxis').value='';$('#dxfFace').value='';
  selected.externo.clear();selected.interno.clear();chainInfo=null;$('#dxfSourceZoom').value=100;resetConfirm();
  updateZ0('');
  ['#dxfSuggest','#dxfSelect','#dxfAll','#dxfAuto','#dxfClear'].forEach(q=>$(q).disabled=false);
  renderSource();renderMeasures();
  suggestView();
  setStep(1);
  status('DXF CAD carregado: '+doc.geometry.length+' entidades. Limpeza automática: '+cleanup.duplicates+' duplicadas e '+cleanup.overlaps+' sobrepostas removidas (mantidas as maiores). O original está preservado no painel 1. Selecione/ajuste a vista e confira o perfil.');
 }catch(e){doc=null;status('Falha ao importar DXF: '+String(e.message||e),true)}
};
function dragOverlay(svg,from,to){
 if(!svg||!from||!to)return;
 let r=svg.querySelector('#dxfDragOverlay');
 if(!r){r=document.createElementNS('http://www.w3.org/2000/svg','rect');r.id='dxfDragOverlay';r.setAttribute('class','dxf-drag-rect');svg.appendChild(r)}
 const box=E.rectBounds([from.x,from.y],[to.x,to.y]);
 r.setAttribute('x',box.x1);r.setAttribute('y',box.y1);
 r.setAttribute('width',box.x2-box.x1);r.setAttribute('height',box.y2-box.y1);
}
function cancelDrag(host){
 const r=host.querySelector('#dxfDragOverlay');if(r)r.remove();
 host.classList.remove('selecting','box-deleting');
}
$('#dxfSuggest').onclick=suggestView;
$('#dxfSelect').onclick=function(){
 if(!doc)return;
 active=true;source.classList.add('selecting');
 $('#dxfSelectionHint').textContent='Arraste sobre o desenho. O RETÂNGULO AZUL acompanhará o mouse; solte para selecionar a vista.';
 status('Arraste para delimitar a vista: o contorno azul fica visível durante a seleção.');
};
$('#dxfAll').onclick=function(){if(doc){view(null);status('Folha inteira. Delimite a vista de torneamento para análise.')}};
$('#dxfSourceZoom').oninput=function(){zoom=Number(this.value)/100;renderSource()};
const source=$('#dxfSource'),projected=$('#dxfProjected');
source.addEventListener('pointerdown',function(e){
 if(!sourceDoc||!active||e.button!==0)return;
 const svg=source.querySelector('svg');if(!svg)return;
 start=viewPoint(e,svg);
 dragOverlay(svg,start,start);source.setPointerCapture(e.pointerId);e.preventDefault();
});
source.addEventListener('pointermove',function(e){
 if(!start)return;
 const svg=source.querySelector('svg');if(svg)dragOverlay(svg,start,viewPoint(e,svg));
});
source.addEventListener('pointerup',function(e){
 if(!start)return;
 const svg=source.querySelector('svg');if(!svg)return;
 const pt=viewPoint(e,svg),a=start;start=null;
 cancelDrag(source);
 const b=DX.bounds(sourceDoc.geometry),first=drawingPoint(a,b),last=drawingPoint(pt,b);
 const next=E.rectBounds(first,last);
 if(next.x2-next.x1<4||next.y2-next.y1<4){
  status('Retângulo muito pequeno. Arraste uma área maior para delimitar a vista.',true);return
 }
 active=false;source.classList.remove('selecting');
 $('#dxfSelectionHint').textContent='Vista delimitada com retângulo visível. Para ajustar, use Delimitar outra vista.';
 view(next);
 status('Vista delimitada: '+fmt(next.x2-next.x1)+' × '+fmt(next.y2-next.y1)+' mm no CAD. Proposta de perfil gerada.');
});
source.addEventListener('pointercancel',()=>{start=null;cancelDrag(source)});
projected.addEventListener('pointerdown',function(e){
 if(doc&&(e.button===1||e.button===0&&(e.shiftKey||$('#dxfPanMode').checked))){
  const svg=projected.querySelector('svg');if(!svg)return;
  projPan={clientX:e.clientX,clientY:e.clientY,inverse:svg.getScreenCTM().inverse(),camera:{...camera},moved:false};skipProjectedClick=true;
  projected.setPointerCapture(e.pointerId);projected.classList.add('panning');e.preventDefault();return;
 }
 if(mode()!=='quadro'||!doc||!rect||e.button!==0)return;
 const svg=projected.querySelector('svg');if(!svg)return;
 projDrag=viewPoint(e,svg);skipProjectedClick=false;
 projected.setPointerCapture(e.pointerId);projected.classList.add('box-deleting');
 dragOverlay(svg,projDrag,projDrag);e.preventDefault();
});
projected.addEventListener('pointermove',function(e){
 if(projPan){const dx=e.clientX-projPan.clientX,dy=e.clientY-projPan.clientY,m=projPan.inverse;
  camera={...projPan.camera,x:projPan.camera.x-(m.a*dx+m.c*dy),y:projPan.camera.y-(m.b*dx+m.d*dy)};projPan.moved=projPan.moved||Math.hypot(dx,dy)>3;applyCamera();return}
 if(!projDrag){inspectCorrection(e);return}const svg=projected.querySelector('svg');
 if(svg)dragOverlay(svg,projDrag,viewPoint(e,svg));
});
projected.addEventListener('pointerup',function(e){
 if(projPan){projPan=null;projected.classList.remove('panning');skipProjectedClick=true;setTimeout(()=>skipProjectedClick=false,0);return}
 if(!projDrag)return;
 const svg=projected.querySelector('svg');if(!svg)return;
 const box=E.rectBounds([projDrag.x,projDrag.y],[viewPoint(e,svg).x,viewPoint(e,svg).y]);
 projDrag=null;skipProjectedClick=true;cancelDrag(projected);
 // O clique sintético gerado pelo fim do arraste pode chegar nesta mesma tarefa;
 // nunca descartar o PRIMEIRO clique real seguinte em outra linha.
 setTimeout(()=>{skipProjectedClick=false},0);
 if(box.x2-box.x1<3||box.y2-box.y1<3){status('Desenhe um retângulo maior para excluir linhas.',true);return}
 const candidates=P.segments(doc.geometry,rect,hidden);
 const ids=E.selectRectSegments(candidates,box,rect,val('#dxfFace'));
 if(!ids.length){status('Nenhuma linha atravessa o retângulo de exclusão.');return}
 remember();
 ids.forEach(id=>{hidden.add(id);selected.externo.delete(id);selected.interno.delete(id)});
 resetEditing();markEdited();
 status(ids.length+' linha(s) removidas da cópia de trabalho pela seleção de retângulo. O CAD original continua preservado.');
});
projected.addEventListener('pointercancel',()=>{projDrag=null;projPan=null;skipProjectedClick=false;projected.classList.remove('panning');cancelDrag(projected)});
projected.addEventListener('wheel',function(e){if(!e.ctrlKey||!doc)return;e.preventDefault();zoomCamera(e.deltaY<0?1.2:1/1.2,viewPoint(e,projected.querySelector('svg')))}, {passive:false});
$('#dxfZoomIn').onclick=()=>zoomCamera(1.25);
$('#dxfZoomOut').onclick=()=>zoomCamera(1/1.25);
$('#dxfZoomFit').onclick=fitCamera;
$('#dxfPanMode').onchange=function(){projected.classList.toggle('pan-ready',this.checked)};
$('#dxfCameraHelp').onclick=function(){const hint=$('#dxfCameraHint');hint.hidden=!hint.hidden;this.setAttribute('aria-expanded',String(!hint.hidden))};
projected.addEventListener('click',function(e){
 if(skipProjectedClick){skipProjectedClick=false;return}
 const target=e.target.closest('[data-cad-segment],[data-cad-reference]');if(!target||!doc)return;
 const id=target.getAttribute('data-cad-segment')||target.getAttribute('data-cad-reference'),currentMode=mode();
 if($('#dxfPanMode').checked)return;
 const entity=P.segments(doc.geometry,rect,hidden).find(t=>t.uid===id);
 if(entity){
  const info=P.classify(entity,axis,val('#dxfFace')||'esquerda');
  const caption=info.kind==='cil'?'Cilindro · Ø'+fmt(info.a)+' · comprimento '+fmt(info.b)+' mm':
   info.kind==='cone'?'Cone · Ø'+fmt(info.a)+' → Ø'+fmt(info.b)+' · comprimento '+fmt(info.c)+' mm':
   info.kind==='raio'?'Arco CAD R'+fmt(info.r)+' mm · preservado no contorno CNC':
   info.kind==='face'?'Face radial/degrau · Ø'+fmt(info.di)+' → Ø'+fmt(info.df):
   'Entidade não traduzível diretamente';
  $('#dxfEntityInfo').textContent='Entidade '+id+': '+caption+'. '+(info.reason||'');
 }
 if(!currentMode)return;
 if(currentMode==='quadro')return;
 if(currentMode==='estender'){
  pendingExtension=id;$('#dxfExtendSelected').textContent='Linha selecionada: '+id+
   (entity&&entity.kind==='line'?' — pronta para extensão.':' — escolha uma linha reta.');
  renderProjection();status('Linha '+id+' selecionada. Escolha início/fim e o modo de extensão.');return;
 }
 if(currentMode==='quebrar'){
  remember();const result=G.breakSegment(doc.geometry,id,editOptions());
  if(!result.ok){failedEdit(result);return}
  applyGeometry(result);resetEditing();markEdited();status('Elemento dividido em '+result.pieces+' partes nos cruzamentos com linhas, arcos e eixo. Use Apagar linha para retirar a parte desejada.');return;
 }
 if(currentMode==='conectar'){
  if(!['line','arc'].includes(entity?.kind)){status('Escolha duas retas ou arcos para conectar.',true);return}
  if(!pendingConnection){pendingConnection=id;$('#dxfConnectHint').textContent='Primeira linha/arco: '+id+'. Agora clique na segunda linha ou arco.';renderProjection();status('Primeiro elemento selecionado. Clique numa segunda reta ou arco para conectá-los.');return}
  const first=P.segments(doc.geometry,rect,hidden).find(s=>s.uid===pendingConnection);
  if(first&&pendingConnection!==id&&DX.sample(first,1).some(a=>DX.sample(entity,1).some(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<=.001))){
   resetEditing();renderProjection();status('Linhas já conectadas; nenhuma alteração é necessária. O círculo verde indica o encontro corrigido.');
   const marker=projected.querySelector('[data-cad-correction]');if(marker)showCorrectionNotice(Number(marker.dataset.cadCorrection));return;
  }
  remember();const result=G.connectLines(doc.geometry,pendingConnection,id,editOptions());
  if(!result.ok){failedEdit(result);return}
  applyGeometry(result);resetEditing();markEdited((result.corrections||[]).map(c=>({...c,uid:result.remap[c.uid]?.[0]||c.uid})));status('Linhas conectadas no ponto CAD '+result.meeting.map(fmt).join(' / ')+' mm.'+(result.added?.length?' Ligação reta curta criada entre as pontas; arcos intactos.':' Centros e raios dos arcos preservados.')+' Confira o perfil.');return;
 }
 if(currentMode==='apagar'){removeLine(id);status('Entidade '+id+' apagada apenas do desenho de trabalho. Use Desfazer se necessário.');return}
 if(['externo','interno'].includes(currentMode)&&!P.above(entity,axis)){
  status('A metade inferior é somente referência. Para trechos que cruzam o eixo, use Quebrar linha e selecione a parte superior.',true);return;
 }
 remember();
 if(currentMode==='remover'){selected.externo.delete(id);selected.interno.delete(id)}
 else{const other=currentMode==='externo'?'interno':'externo';
  selected[other].delete(id);
  if(selected[currentMode].has(id))selected[currentMode].delete(id);else selected[currentMode].add(id);
 }
 resetConfirm();renderProjection();
});
$('#dxfAxis').oninput=function(){resetEditing();resetConfirm();autoRecognize();renderProjection()};
$('#dxfFace').onchange=function(){updateZ0(val('#dxfFace'))};
$('#dxfZ0Left').onclick=()=>updateZ0('esquerda');
$('#dxfZ0Right').onclick=()=>updateZ0('direita');
$('#dxfZ0Pending').onclick=()=>updateZ0('');
$('#dxfLength').oninput=function(){resetConfirm();renderProjection()};
$('#dxfNome').oninput=function(){resetConfirm();renderProjection()};
$('#dxfMeasuredLength').onclick=function(){const a=analyse('externo');if(!a?.nativeProfile?.ok){status('Selecione primeiro uma cadeia superior válida.',true);return}$('#dxfLength').value=Number(a.nativeProfile.length.toFixed(6));resetConfirm();renderProjection();status('Comprimento calculado somente pelo perfil superior: '+fmt(a.nativeProfile.length)+' mm.')};
$('#dxfChecked').onchange=renderProjection;
$('#dxfAuto').onclick=function(){autoRecognize()};
$('#dxfClear').onclick=function(){remember();selected.externo.clear();selected.interno.clear();resetConfirm();renderProjection()};
$('#dxfRepair').onclick=function(){
 const target=lastProfile;
 const ids=analyse(target)?.selected.map(s=>s.uid)||[];
 if(ids.length<2){status('Selecione pelo menos dois elementos do mesmo perfil.',true);return}
 remember();const result=G.linkGaps(doc.geometry,ids,editOptions());
 if(!result.ok){failedEdit(result);return}
 applyGeometry(result);resetEditing();markEdited(result.corrections.map(c=>({...c,uid:result.remap[c.uid]?.[0]||c.uid})));
 status(result.corrections.length+(result.corrections.length===1?' ajuste realizado':' ajustes realizados')+'; maior deslocamento ou ligação '+result.maxDistance.toFixed(6).replace('.',',')+' mm.'+(result.added?.length?' '+result.added.length+' ligação(ões) reta(s) curta(s) criada(s).':'')+' Veja as linhas/arcos verdes e os encontros numerados. Confira as cotas novamente.');
};
document.querySelectorAll('[data-dxf-mode]').forEach(b=>b.onclick=function(){setMode(mode()===this.dataset.dxfMode?'':this.dataset.dxfMode);if(doc)renderProjection()});
$('#dxfExtendMode').onchange=function(){$('#dxfExtendAmountLabel').hidden=this.value!=='mm'};
$('#dxfConnectCancel').onclick=function(){resetEditing();renderProjection();status('Seleção cancelada. Clique na primeira linha para começar novamente.')};
$('#dxfExtendApply').onclick=function(){
 if(!pendingExtension){status('Clique primeiro em uma linha do contorno para estender.',true);return}
 remember();
 const result=val('#dxfExtendMode')==='proxima'?G.extendToNext(doc.geometry,pendingExtension,val('#dxfExtendEnd'),editOptions()):G.extendLine(doc.geometry,pendingExtension,val('#dxfExtendEnd'),val('#dxfExtendAmount'),editOptions());
 if(!result.ok){failedEdit(result);return}
 applyGeometry(result);pendingExtension=result.remap[pendingExtension]?.[0]||pendingExtension;
 $('#dxfExtendSelected').textContent='Linha selecionada: '+pendingExtension+' — pronta para extensão.';
 markEdited();status('Linha estendida em '+fmt(result.length)+' mm'+(result.target==='__cad_axis__'?' até o eixo central.':result.target?' até o próximo elemento.':'.')+' Confira a continuidade e as cotas antes de salvar.');
};
$('#dxfUndo').onclick=function(){
 clearCorrectionNotice();noticeHover=0;
 const prior=undo.pop();if(!prior)return;
 doc=prior.doc;hidden=new Set(prior.hidden);selected.externo=new Set(prior.externo);selected.interno=new Set(prior.interno);
 editCount=prior.editCount;corrections=clone(prior.corrections||[]);resetEditing();$('#dxfUndo').disabled=undo.length===0;resetConfirm();renderProjection();status('Última edição desfeita.');
};
$('#dxfRestore').onclick=function(){
 clearCorrectionNotice();noticeHover=0;
 if(!sourceDoc)return;
 if(!confirm('Restaurar a geometria CAD original e apagar as extensões/exclusões feitas na cópia de trabalho?'))return;
 remember();doc=clone(sourceDoc);hidden.clear();editCount=0;corrections=[];resetEditing();
 selected.externo.clear();selected.interno.clear();resetConfirm();autoRecognize();renderProjection();
 status('Geometria original restaurada. Proposta automática refeita.');
};
function makeDraft(){
 const nome=val('#dxfNome').trim();
 const geometryEdits=G.geometryDelta(sourceDoc.geometry,doc.geometry);
 // Guardar o CAD uma só vez + alterações em delta evita duplicar DXFs grandes no localStorage.
 return {id:root.crypto.randomUUID(),nome,data:new Date().toLocaleString('pt-BR'),fileName,sourceDoc,rect,axis:val('#dxfAxis'),
  face:val('#dxfFace'),length:val('#dxfLength'),externo:[...selected.externo],interno:[...selected.interno],
  hidden:[...hidden],geometryEdits,editCount,corrections:clone(corrections)};
}
function preserveDraft(){const draft=makeDraft(),list=draftList();root.CNCDXFDrafts.set([draft,...list]);refreshDrafts();return draft.id}
$('#dxfSaveDraft').onclick=function(){
 if(!doc){status('Selecione um DXF antes de salvar.',true);return}
 let nome=val('#dxfNome').trim();if(!nome){status('Informe o nome do rascunho.',true);return}
 try{
  preserveDraft();
  $('#dxfSaved').textContent='Rascunho "'+nome+'" salvo localmente, sem liberar CNC.';
  status('Rascunho salvo. A face Z0 pode permanecer indefinida até a preparação da máquina.');
 }catch(e){status('Falha no armazenamento local; espaço esgotado ou indisponível.',true)}
};
function openDraft(entry){
 if(!entry)return;
 clearCorrectionNotice();editingDrawing=null;editingSide='1';saveSide='1';restoredInternals=null;$('#dxfSaveTwoSides').checked=true;
 try{
  const original=clone(entry.sourceDoc||entry.doc),working=clone(original);
  if(entry.geometryEdits)working.geometry=G.restoreGeometry(original.geometry,entry.geometryEdits);
  else (entry.lineEdits||[]).forEach(edit=>{
   const line=working.geometry.find(e=>e.type==='LINE'&&e.id===edit.id);
   if(line){line.a=clone(edit.a);line.b=clone(edit.b)}
  });
  if(entry.geometryEdits)working.count=working.geometry.length;
  sourceDoc=original;doc=working;
 }catch(e){status('Não foi possível abrir o rascunho: '+e.message,true);return}
 rect=entry.rect;fileName=entry.fileName;zoom=1;fitCamera();
 hidden=new Set(entry.hidden||[]);editCount=entry.editCount||0;corrections=clone(entry.corrections||[]);undo=[];setMode('');
 $('#dxfUndo').disabled=true;$('#dxfRestore').disabled=false;
 $('#dxfNome').value=entry.nome;$('#dxfAxis').value=entry.axis??'';
 $('#dxfFace').value=entry.face||'';$('#dxfLength').value=entry.length??'';
 updateZ0(entry.face||'');
 selected.externo=new Set(entry.externo||[]);selected.interno=new Set(entry.interno||[]);
 ['#dxfSuggest','#dxfSelect','#dxfAll','#dxfAuto','#dxfClear'].forEach(q=>$(q).disabled=false);
 resetConfirm();renderSource();renderMeasures();renderProjection();setStep(rect&&val('#dxfAxis')!==''?2:1);status('Rascunho CAD carregado. Confira todas as cotas e a fixação.');
}
$('#dxfOpenDraft').onclick=()=>openDraft(draftList()[Number(val('#dxfDraftList'))]);
function openSavedContour(drawing,side='1'){
 const entry=draftList().find(d=>d.id===drawing.cadOrigem?.draftId);
 if(entry&&side===(drawing.cadOrigem?.draftSide||'1')){openDraft(entry);editingDrawing=clone(drawing);editingSide=side;saveSide=side;$('#dxfSaveTwoSides').checked=drawing.lados==='2'&&!!drawing.cadDuplo;$('#dxfNome').value=drawing.nome;return}
 const item=drawing['trechos'+side]?.find(t=>t.tipo==='cadperfil'),cad=root.CNCPerfilCAD,info=cad.validate(item?.path);
 if(!info.ok){status('O desenho salvo não contém um contorno CAD válido.',true);return}
 const coord=p=>[p[0]+info.length+50,p[1]],geometry=item.path.map((s,i)=>({id:'saved'+i,type:s.kind==='arc'?'ARC':'LINE',a:coord(s.a),b:coord(s.b),...(s.kind==='arc'?{c:coord(s.c),r:s.r,sweep:s.ccw?1:-1}:{} )}));
 const base={geometry,entities:[],dimensions:[],units:4,unitName:'Milímetros',count:geometry.length,unsupported:{}};
 const b=DX.bounds(geometry);openDraft({sourceDoc:base,rect:{x1:b.x1-3,x2:b.x2+3,y1:b.y1-3,y2:b.y2+3},fileName:drawing.cadOrigem?.arquivo||'contorno-salvo',nome:drawing.nome,axis:0,face:'direita',length:info.length,externo:geometry.map(s=>s.id+':0')});
 editingDrawing=clone(drawing);editingSide=side;saveSide=side;restoredInternals=clone(drawing['internos'+side]||[]);$('#dxfSaveTwoSides').checked=drawing.lados==='2'&&!!drawing.cadDuplo;
 status('Contorno salvo reaberto com medidas e arcos exatos. A fonte DXF completa não acompanha este backup; reimporte-a para recuperar referências auxiliares.');
}
function toItems(mode,ana,face){
 return ana.selected.map(q=>{
  let info=P.classify(q,axis,face);
  let pts=DX.sample(q,1),mid=(pts[0][0]+pts[pts.length-1][0])/2;
  return {mid,info};
 }).sort((a,b)=>face==='direita'?b.mid-a.mid:a.mid-b.mid).map(q=>{
   let c=q.info;if(c.kind==='cil')return {tipo:mode==='externo'?'cil':'icil',side:'1',a:c.a,b:c.b};
   if(c.kind==='cone')return {tipo:mode==='externo'?'cone':'icone',side:'1',a:c.a,b:c.b,c:c.c};
   return null;
 }).filter(Boolean);
}
$('#dxfSaveCNC').onclick=function(){
 if(!doc||!rect){status('Abra um DXF e delimite uma vista.',true);return}
 let e=analyse('externo'),i=analyse('interno'),length=Number(val('#dxfLength')),face=val('#dxfFace');
 const cn=P.analyze(doc,rect,axis,face,new Set(),hidden).candidate;
 const aud=root.CNCDXFAuditoria.check({doc,axis,face,length,external:e,internal:i,nativeDimensions:dimsForRect(),
  candidateSegments:cn,unsupportedCurves:DX.cut(doc.geometry,rect).filter(q=>q.type==='SPLINE'||q.type==='ELLIPSE').length,
  threadNotes:DX.annotations(doc.entities,rect,26).filter(q=>q.at?.[1]>=axis&&/\b(?:M\s*\d+|ROSCA|FURO|THREAD)\b/i.test(q.text||'')).length+dimsForRect().filter(d=>d.position?.[1]>=axis&&/^[Mm]\s*\d+/.test(String(d.text||''))).length});
 if(!aud.ok){status('Perfil CAD ainda incompleto: '+aud.problems.join(' · '),true);return}
 if(!e||!checked()||!e.canExport||(i&&i.selected.length&&i.classified.some(t=>t.kind!=='cil'&&t.kind!=='cone'))||!Number.isFinite(length)||length<=0||doc.units!==4||!['esquerda','direita'].includes(face)){
  status('Não é possível salvar: confirme a escala, vista, Z0, cotas e continuidade de todas as entidades.',true);return;
 }
 let items=[{tipo:'cadperfil',side:'1',path:clone(e.nativeProfile.path)}].concat(i&&i.selected.length?toItems('interno',i,face):[]);
 let max=2*e.nativeProfile.radius;
 let api=root.CNCDesenhos;
 if(!api||!api.salvarPDF){status('Editor CNC não disponível.',true);return}
 let draftId;try{draftId=preserveDraft()}catch(err){status('Não foi possível preservar a fonte CAD: '+err.message,true);return}
 let id;try{id=api.salvarPDF(saveData(draftId))}catch(error){status('Não foi possível preparar os lados: '+error.message,true);return}
 if(id){resetConfirm();$('#dxfSaved').textContent='Perfil enviado ao Gerador: '+val('#dxfNome');status('Perfil CNC salvo. Revise fixação, ferramentas e simulação antes de usinar.')}
};
$('#dxfEditManual').onclick=function(){
 if(!doc||!rect){status('Abra um DXF e delimite uma vista antes de editar.',true);return}
 let len=Number(val('#dxfLength')),face=val('#dxfFace');
 if(!(len>0)||!['esquerda','direita'].includes(face)){status('Informe o comprimento e escolha o Z0 provisório para transferir trechos. O rascunho CAD pode ser salvo sem Z0.',true);return}
 axis=Number(val('#dxfAxis'));if(!Number.isFinite(axis)||val('#dxfAxis')===''){status('Informe a coordenada do eixo X0.',true);return}
 let e=analyse('externo'),i=analyse('interno');
 if(e?.nativeProfile?.ok&&e.classified.some(t=>t.kind==='raio'||t.kind==='face')){
  if(i?.selected.length&&i.classified.some(t=>!['cil','cone'].includes(t.kind))){status('O perfil interno contém entidades sem tradução; revise-o antes de transferir.',true);return}
  let draftId;try{draftId=preserveDraft()}catch(err){status('Não foi possível preservar a fonte CAD: '+err.message,true);return}
  root.CNCDesenhos.importarPDF({nome:val('#dxfNome')||'Rascunho DXF',lPeca:len,dRef:Math.ceil(2*e.nativeProfile.radius+4),items:[{tipo:'cadperfil',side:'1',path:clone(e.nativeProfile.path)},...(i?.selected.length?toItems('interno',i,face):[])],cadOrigem:{arquivo:fileName,unidade:doc.unitName,faceZ0:face,eixoCAD:axis,nativo:true,draftId,verificado:false,incompleto:true,alteradoCAD:editCount>0}});
  return;
 }
 let items=(e?toItems('externo',e,face):[]).concat(i&&i.selected.length?toItems('interno',i,face):[]);
 if(!items.length){status('Marque pelo menos uma linha de cilindro/cone. Não é possível traduzir arcos sem o canto correspondente.',true);return}
 if(!confirm('Transferir SOMENTE '+items.length+' trechos retos para o editor manual, SEM raios/roscas/entidades faltantes? Este rascunho NÃO é um perfil completo e exige revisão antes de salvar/gerar CNC.'))return;
 let max=Math.max(...items.filter(q=>q.tipo[0]!=='i').map(q=>Math.max(q.a,q.tipo==='cone'?q.b:q.a)));
 if(!Number.isFinite(max)){status('Selecione algum contorno externo.',true);return}
 let ok=root.CNCDesenhos&&root.CNCDesenhos.importarPDF({nome:val('#dxfNome')||'Rascunho DXF',lPeca:len,dRef:Math.ceil(max+4),items,
  cadOrigem:{arquivo:fileName,unidade:doc.unitName,faceZ0:face,eixoCAD:axis,verificado:false,incompleto:true,alteradoCAD:editCount>0,segmentosExcluidos:hidden.size}});
 if(!ok){status('O editor não aceitou a transferência de rascunho.',true);return}
 $('#dxfPanel').hidden=true;$('#pdfManual').hidden=false;
 alert('Rascunho aberto no editor manual. Revise raios, roscas, cavidades e descontinuidades antes de salvar no Gerador.');
};
$('#dxfModo').onclick=function(){$('#dxfPanel').hidden=false;$('#pdfPanel').hidden=true;$('#pdfManual').hidden=true;refreshDrafts();if(root.CNCDXFRequestedDrawing){const d=root.CNCDXFRequestedDrawing,side=root.CNCDXFRequestedSide||'1';delete root.CNCDXFRequestedDrawing;delete root.CNCDXFRequestedSide;openSavedContour(d,side)}};
$('#dxfVoltar').onclick=function(){$('#dxfPanel').hidden=true;$('#pdfManual').hidden=false};
refreshDrafts();
updateSteps();
root.CNCDXFImport={refreshDrafts,getModel:()=>doc,getOriginal:()=>sourceDoc,getRegion:()=>rect,getSelected:()=>selected,getHidden:()=>hidden,getCorrections:()=>corrections,getStep:()=>step,getMode:()=>activeMode};
})(window);
