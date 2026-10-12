/* Projeção geométrica DXF — mesmo fator de escala em Z e X.
   Não inventa trajetória/raio e não libera programação com contorno aberto. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./dxfcore.js'),require('./dxfturn.js'));
 else root.CNCDXFPerfil=factory(root.CNCDXF,root.CNCDXFTorno);
})(typeof self!=='undefined'?self:this,function(DX,T){
'use strict';
if(!DX)throw new Error('Biblioteca DXF ausente: carregue dxfcore.js antes de dxfprofile.js.');
function fmt(n){return Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3})}
function esc(n){return String(n).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function intersect(e,r){return DX.cut([e],r).length>0}
function sectionSuggestion(doc){
 let circles=doc.geometry.filter(e=>e.type==='CIRCLE'&&e.r>6),groups=[];
 circles.forEach(e=>{let g=groups.find(v=>Math.hypot(v.x-e.c[0],v.y-e.c[1])<1);if(!g)groups.push(g={x:e.c[0],y:e.c[1],n:0,max:0});g.n++;g.max=Math.max(g.max,e.r)});
 groups.sort((a,b)=>b.n-a.n);
 let front=groups.find(g=>g.n>=3&&g.x>0);if(!front)return null;
 let right=front.x-front.max-10;
 let cand=doc.geometry.filter(e=>{
  if(!['LINE','ARC','LWPOLYLINE','SPLINE'].includes(e.type))return false;
  let b=DX.bounds([e]);if(!b)return false;
  return b.x1>0&&b.x2<right&&b.y1>front.y-front.max-2&&b.y2<front.y+front.max+2;
 });
 if(!cand.length)return null;
 let b=DX.bounds(cand);
 if(!b||b.width<15||b.height<15)return null;
 return {rect:{x1:b.x1-3,y1:b.y1-3,x2:b.x2+3,y2:b.y2+3},axis:front.y,front,origin:'circunferências concêntricas da vista frontal; conferir antes de aceitar'};
}
function segments(geometry,rect,hidden){
 const src=rect?DX.cut(geometry,rect):geometry,all=[];
 src.forEach(e=>{
  const segs=DX.explode(e);
  segs.forEach((v,j)=>{const id=e.id+':'+j;if(!hidden||!hidden.has(id))all.push(Object.assign({},v,{uid:id,parent:e.id}))});
 });
 return all;
}
function above(seg,axis,tol=1e-6){
 const pts=DX.sample(seg,128);return Number.isFinite(axis)&&pts.length&&pts.every(p=>p[1]>=axis-tol);
}
function classify(seg,axis,face,tol=.12){
 const pts=DX.sample(seg,36),a=pts[0],b=pts[pts.length-1];
 if(!a||!b)return {kind:'unsupported',reason:'Entidade sem pontos'};
 let p0=a,p1=b;
 if(face==='direita'){if(p0[0]<p1[0]){p0=b;p1=a}}
 else if(p0[0]>p1[0]){p0=b;p1=a}
 const length=Math.abs(p1[0]-p0[0]),d0=2*Math.abs(p0[1]-axis),d1=2*Math.abs(p1[1]-axis);
 if(seg.kind==='arc')return {kind:'raio',r:seg.r,length,di:d0,df:d1,reason:'Arco circular nativo: centro, raio e sentido preservados no perfil'};
 if(length<=tol)return {kind:'face',length,di:d0,df:d1,reason:'Face/degrau radial (deslocamento X)'};
 if(seg.kind==='line'&&Math.abs(d1-d0)<=tol)return {kind:'cil',a:d0,b:length};
 if(seg.kind==='line')return {kind:'cone',a:d0,b:d1,c:length};
 return {kind:'unsupported',reason:'Curva não traduzida'};
}
function endpoints(s){if(s.kind==='line')return[s.a,s.b];if(s.kind==='arc')return s.a&&s.b?[s.a,s.b]:DX.arcEnds?DX.arcEnds(s):[DX.sample(s,1)[0],DX.sample(s,1)[1]];return []}
function connectivity(segs,tol=.001){
 if(!segs.length)return {components:0,gaps:[],branches:[],closed:false,chain:[],groups:[]};
 const nodes=[],grid=new Map(),adj=new Map();
 function node(p){
  const bx=Math.floor(p[0]/tol),by=Math.floor(p[1]/tol);
  for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++){
   const bucket=grid.get(x+':'+y)||[];
   for(const n of bucket)if(Math.hypot(nodes[n].p[0]-p[0],nodes[n].p[1]-p[1])<=tol)return n;
  }
  const n=nodes.length,k=bx+':'+by;nodes.push({p,ids:[]});if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);return n;
 }
 segs.forEach(s=>{const ps=endpoints(s);if(ps.length!==2)return;
  const u=node(ps[0]),v=node(ps[1]);nodes[u].ids.push(s.uid);nodes[v].ids.push(s.uid);
 });
 const branches=nodes.filter(n=>n.ids.length>2).map(n=>n.p),gaps=nodes.filter(n=>n.ids.length===1).map(n=>n.p);
 for(const s of segs)adj.set(s.uid,new Set());
 for(const n of nodes)for(const a of n.ids)for(const b of n.ids)if(a!==b)adj.get(a)?.add(b);
 const seen=new Set(),groups=[];
 for(const id of adj.keys()){
  if(seen.has(id))continue;seen.add(id);const stack=[id],group=[];
  while(stack.length){const x=stack.pop();group.push(x);for(const y of adj.get(x)||[])if(!seen.has(y)){seen.add(y);stack.push(y)}}
  groups.push(group);
 }
 groups.sort((a,b)=>b.length-a.length);
 return {components:groups.length,gaps,branches,closed:gaps.length===0&&branches.length===0&&groups.length===1,groups,chain:groups[0]||[]};
}
function analyze(doc,rect,axis,face,chosen,hidden){
 const all=segments(doc.geometry,rect,hidden);
 const upper=Number.isFinite(axis)?all.filter(s=>above(s,axis)):[],candidate=upper.filter(s=>['line','arc'].includes(s.kind));
 const selected=candidate.filter(s=>chosen&&chosen.has(s.uid));
 const cn=connectivity(selected);
 const classified=selected.map(s=>Object.assign({uid:s.uid},classify(s,axis,face)));
 const nativeProfile=T.build(selected,axis,face);
 let alerts=[];
 if(!Number.isFinite(axis))alerts.push('Identifique o eixo central (X0) antes de converter a seção.');
 if(!['esquerda','direita'].includes(face))alerts.push('Defina a face Z0 voltada à ferramenta antes de exportar CNC.');
 if(!rect)alerts.push('Selecione a vista lateral da peça.');
 if(!selected.length)alerts.push('Nenhuma entidade selecionada para o perfil CNC. Use a prévia CAD e selecione o contorno.');
 if(cn.components>1)alerts.push('Perfil descontínuo: '+cn.components+' grupos separados. Conecte os trechos que pertencem ao perfil.');
 if(cn.branches.length)alerts.push('Ramificações ('+cn.branches.length+'): '+cn.branches.slice(0,4).map(p=>'Z CAD '+fmt(p[0])+' / Ø'+fmt(2*Math.abs(p[1]-axis))).join('; ')+'. Selecione as cadeias corretas, excluindo linhas auxiliares.');
 if(cn.gaps.length>2)alerts.push('Perfil com '+cn.gaps.length+' pontas abertas. Primeiras lacunas em '+cn.gaps.slice(0,5).map(p=>'Z CAD '+fmt(p[0])+' / Ø'+fmt(2*Math.abs(p[1]-axis))).join('; ')+'. Selecione a cadeia seguinte ou corrija o DXF.');
 if(selected.length&&!nativeProfile.ok)alerts.push(...nativeProfile.problems);
 if(!selected.length&&doc.geometry.some(s=>s.type==='SPLINE'&&intersect(s,rect||DX.bounds(doc.geometry))))alerts.push('SPLINE sem tradução CNC: selecione uma cadeia completa de linhas e arcos circulares.');
 if(doc.units!==4)alerts.push('Unidade do DXF não é milímetro; confirme/converta o arquivo.');
 return {all,upper,candidate,selected,classified,connection:cn,alerts,nativeProfile,
   canExport:alerts.length===0&&nativeProfile.ok};
}
function polyPath(pts,coord){if(!pts.length)return'';return pts.map((p,i)=>(i?'L':'M')+coord(p).map(v=>v.toFixed(2)).join(',')).join(' ')}
function svg(doc,rect,options){
 options=options||{};
 let b=rect?{x1:Number(rect.x1),y1:Number(rect.y1),x2:Number(rect.x2),y2:Number(rect.y2),
  width:Number(rect.x2)-Number(rect.x1),height:Number(rect.y2)-Number(rect.y1)}:DX.bounds(doc.geometry);
 if(b&&(!Number.isFinite(b.width)||!Number.isFinite(b.height)||b.width<=0||b.height<=0))
  return '<svg viewBox="0 0 400 200" role="img" aria-label="Vista CAD inválida"><text x="15" y="35">Delimite uma vista CAD válida.</text></svg>';
 if(!b)return '<svg viewBox="0 0 400 200"><text x="15" y="35">Sem geometria</text></svg>';
 let W=900,H=480,margin=30,scale=Math.min((W-2*margin)/Math.max(1,b.width),(H-2*margin)/Math.max(1,b.height));
 const pos=p=>{
  let xx=margin+(p[0]-b.x1)*scale;
  // O perfil CNC sempre mostra Z0 à direita. Se Z0 está à esquerda do CAD,
  // espelha-se apenas a apresentação, sem alterar nenhuma medida.
  if(options.face==='esquerda')xx=W-xx;
  return [xx,H-margin-(p[1]-b.y1)*scale];
 };
 let out='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Desenho CAD vetorial original; escala geométrica uniforme" data-unit-scale="'+scale.toFixed(6)+'">';
 out+='<rect width="'+W+'" height="'+H+'" fill="#ffffff"/>';
 const color={LINE:'#375777',ARC:'#2a78b4',CIRCLE:'#8ea9b5',LWPOLYLINE:'#375777',SPLINE:'#9a679c',ELLIPSE:'#9a679c'};
 let eList=rect?DX.cut(doc.geometry,rect):doc.geometry;
 const auxiliary=shape=>Number.isFinite(options.axis)?shape.replace('stroke=', 'clip-path="url(#cad-upper)" stroke=')+shape.replace(/stroke="[^"]+"/,'stroke="#91a3b6"').replace(/stroke-dasharray="[^"]+"/,'').replace('stroke=', 'data-reference="true" clip-path="url(#cad-lower)" stroke-dasharray="7 5" stroke='):shape;
 eList.forEach(e=>{
  if(e.type==='CIRCLE'){let p=pos(e.c);out+=auxiliary('<circle cx="'+p[0].toFixed(2)+'" cy="'+p[1].toFixed(2)+'" r="'+(e.r*scale).toFixed(2)+'" fill="none" stroke="'+color.CIRCLE+'" stroke-width="1.15"/>');return}
  let source=DX.explode(e);if(!source.length&&e.type==='SPLINE'){let pts=DX.splinePoints(e,120);if(pts.length>1){out+=auxiliary('<path d="'+polyPath(pts,pos)+'" fill="none" stroke="#9a679c" stroke-dasharray="6 3" stroke-width="1.8"/>')}return}
  source.forEach((s,i)=>{
   let pts=DX.sample(s,128),id=e.id+':'+i,selected=options.selected&&options.selected.has(id);
   if(options.hidden&&options.hidden.has(id))return;
   const reference=Number.isFinite(options.axis)&&!above(s,options.axis),editing=options.editing&&options.editing.has(id);
   const corrected=options.corrected&&options.corrected.has(id);
   let emphasis=editing?'#813ac2':selected?'#ea6700':corrected?'#147c59':(options.candidate&&options.candidate.has(id)?'#087e96':(color[e.type]||'#53728c'));
   const attrs=' d="'+polyPath(pts,pos)+'" fill="none" stroke-linejoin="round" stroke-linecap="round" style="cursor:pointer"';
   if(Number.isFinite(options.axis)){
    if(!reference||pts.some(p=>p[1]>options.axis+1e-6))out+='<path data-cad-segment="'+esc(id)+'"'+(corrected?' data-cad-corrected="true"':'')+attrs+' clip-path="url(#cad-upper)" stroke="'+emphasis+'" stroke-width="'+(editing||selected||corrected?4:2)+'"><title>'+(corrected?'Linha corrigida · ':'')+(s.kind==='arc'?'Arco CAD':'Linha CAD')+'</title></path>';
    if(pts.some(p=>p[1]<options.axis-1e-6))out+='<path '+(pts.every(p=>p[1]<=options.axis+1e-6)?'data-cad-segment':'data-cad-reference')+'="'+esc(id)+'" data-reference="true"'+attrs+' clip-path="url(#cad-lower)" stroke="#91a3b6" stroke-width="1.3" stroke-dasharray="7 5"><title>Referência inferior · fora do perfil CNC</title></path>';
   }else out+='<path data-cad-segment="'+esc(id)+'"'+attrs+' stroke="'+emphasis+'" stroke-width="'+(editing||selected?4:1.25)+'"><title>Geometria CAD</title></path>';
  });
 });
 if(Number.isFinite(options.axis)){
  let ya=pos([b.x1,options.axis])[1];const limit=Math.max(0,Math.min(H,ya));
  out+='<defs><clipPath id="cad-upper"><rect x="0" y="0" width="900" height="'+limit+'"/></clipPath><clipPath id="cad-lower"><rect x="0" y="'+limit+'" width="900" height="'+(H-limit)+'"/></clipPath></defs>';
  out+='<path data-cad-axis="true" d="M10,'+ya.toFixed(2)+'H890" stroke="#d36a2b" stroke-width="1" stroke-dasharray="7 4" pointer-events="none"><title>Eixo central · limite de quebra e extensão</title></path>';
  out+='<text x="14" y="'+(ya-5).toFixed(2)+'" font-size="13" fill="#b75a2f">X0 · eixo</text>';
 }
 if(rect&&['esquerda','direita'].includes(options.face)){
  const cadX=options.face==='esquerda'?rect.x1:rect.x2;
  const screen=pos([cadX,Number.isFinite(options.axis)?options.axis:(rect.y1+rect.y2)/2]);
  // A ponta exata ainda depende da confirmação da face e do perfil. Marcador de referência visual.
  out+='<line x1="'+screen[0].toFixed(2)+'" y1="12" x2="'+screen[0].toFixed(2)+'" y2="'+(H-12)+'" stroke="#db4b16" stroke-width="2" stroke-dasharray="7 4"/>'+
   '<text x="35" y="22" fill="#b33c0a" font-size="16" font-weight="bold">Z0 · face '+(options.face==='esquerda'?'esquerda':'direita')+'</text>';
 }
 if(options.dimensions)options.dimensions.slice(0,75).forEach(d=>{
  let p=pos(d.position);if(p[0]>=10&&p[0]<=W-15&&p[1]>=15&&p[1]<=H-15){
    out+='<text x="'+p[0].toFixed(2)+'" y="'+p[1].toFixed(2)+'" font-size="11" fill="#6d4983">'+
    (d.diameter||d.kind===5?'Ø':d.kind===4?'R':'')+(d.measure===null?esc(d.text):fmt(d.measure))+'</text>';
  }
 });
 const correctionPoints=new Set();
 (options.corrections||[]).forEach((c,i)=>{
  const p=pos(c.to),before=pos(c.from);if(c.to[1]<options.axis-1e-6)return;
  const key=c.to.map(n=>n.toFixed(6)).join(':');if(correctionPoints.has(key))return;correctionPoints.add(key);
  out+='<g data-cad-correction="'+(i+1)+'" pointer-events="none"><path d="M'+before.join(',')+'L'+p.join(',')+'" stroke="#147c59" stroke-width="3"/><circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="none" stroke="#147c59" stroke-width="2"/><text x="'+(p[0]+10)+'" y="'+(p[1]-8)+'" font-size="13" fill="#147c59">'+(i+1)+'</text><title>Conexão ajustada '+(i+1)+': '+esc(c.uid)+' · '+c.distance.toFixed(6)+' mm</title></g>';
 });
 out+='</svg>';return out;
}
return {sectionSuggestion,segments,above,classify,connectivity,analyze,svg};
});
