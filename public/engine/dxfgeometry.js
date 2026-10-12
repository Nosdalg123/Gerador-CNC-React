/* Operações CAD exatas em coordenadas da origem. Alteram somente a cópia de trabalho.
 * O eixo é construção: participa de interseções, nunca da seleção/exportação CNC. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./dxfcore.js'),require('./dxfprofile.js'));
 else root.CNCDXFGeometria=factory(root.CNCDXF,root.CNCDXFPerfil);
})(typeof self!=='undefined'?self:this,function(DX,P){
'use strict';
const EPS=1e-6,TAU=2*Math.PI,MAX_EXTEND=10000;
const clone=v=>JSON.parse(JSON.stringify(v)),sub=(a,b)=>[a[0]-b[0],a[1]-b[1]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1],cross=(a,b)=>a[0]*b[1]-a[1]*b[0],dist=(a,b)=>Math.hypot(...sub(a,b));
const point=(a,v,t)=>[a[0]+t*v[0],a[1]+t*v[1]],mod=x=>((x%TAU)+TAU)%TAU;
const fail=reason=>({ok:false,reason});
function arcData(s){
 if(s.kind==='circle'||s.type==='CIRCLE')return {start:0,span:TAU,sign:1};
 const ends=DX.sample(s,1);if(ends.length<2)return null;
 const start=Math.atan2(ends[0][1]-s.c[1],ends[0][0]-s.c[0]),end=Math.atan2(ends[1][1]-s.c[1],ends[1][0]-s.c[0]),sign=s.sweep<0?-1:1;
 let span=mod(sign*(end-start));if(Math.abs(Number(s.end)-Number(s.start))>=360-EPS)span=TAU;
 return {start,span,sign};
}
function parameter(s,p){
 if(s.kind==='line'){const v=sub(s.b,s.a),d=dot(v,v);return d>0?dot(sub(p,s.a),v)/d:NaN}
 const arc=arcData(s);if(!arc||!arc.span)return NaN;
 const angle=Math.atan2(p[1]-s.c[1],p[0]-s.c[0]);let progress=mod(arc.sign*(angle-arc.start));
 if(TAU-progress<EPS/Math.max(s.r,1))progress=0;
 return progress/arc.span;
}
function contains(s,p){
 if(!p.every(Number.isFinite))return false;
 if(s.kind==='line'){
  const v=sub(s.b,s.a),length=Math.hypot(...v);if(length<=EPS)return dist(s.a,p)<=EPS;
  if(Math.abs(cross(sub(p,s.a),v))/length>EPS)return false;
  const t=parameter(s,p);return s.infinite?(!s.ray||t>=-EPS/length):t>=-EPS/length&&t<=1+EPS/length;
 }
 if(!(s.r>0)||Math.abs(dist(s.c,p)-s.r)>EPS)return false;
 if(s.kind==='circle'||s.type==='CIRCLE')return true;
 const t=parameter(s,p);return Number.isFinite(t)&&t<=1+EPS/Math.max(s.r,1);
}
function uniquePoints(points){const result=[];for(const p of points)if(p.every(Number.isFinite)&&!result.some(q=>dist(p,q)<=EPS))result.push(p);return result}
function intersections(a,b){
 let points=[];
 if(a.kind==='line'&&b.kind==='line'){
  const v=sub(a.b,a.a),w=sub(b.b,b.a),den=cross(v,w),length=Math.hypot(...v)*Math.hypot(...w);
  if(Math.abs(den)>length*1e-12)points=[point(a.a,v,cross(sub(b.a,a.a),w)/den)];
  else if(length>0&&Math.abs(cross(sub(b.a,a.a),v))/Math.hypot(...v)<=EPS)points=[a.a,a.b,b.a,b.b];
 }else if(a.kind==='line'||b.kind==='line'){
  const line=a.kind==='line'?a:b,circle=a.kind==='line'?b:a,v=sub(line.b,line.a),u=sub(line.a,circle.c),A=dot(v,v),B=2*dot(u,v),C=dot(u,u)-circle.r*circle.r,D=B*B-4*A*C;
  if(A>0&&D>=-1e-12*Math.max(1,B*B,Math.abs(4*A*C))){const root=Math.sqrt(Math.max(0,D));points=[point(line.a,v,(-B-root)/(2*A)),point(line.a,v,(-B+root)/(2*A))]}
 }else{
  const d=dist(a.c,b.c);
  if(d<=EPS){if(Math.abs(a.r-b.r)<=EPS)points=[...DX.sample(a,1),...DX.sample(b,1)]}
  else if(d<=a.r+b.r+EPS&&d>=Math.abs(a.r-b.r)-EPS){
   const x=(a.r*a.r-b.r*b.r+d*d)/(2*d),h2=a.r*a.r-x*x;
   if(h2>=-EPS){const h=Math.sqrt(Math.max(0,h2)),u=sub(b.c,a.c).map(v=>v/d),middle=point(a.c,u,x);points=[[middle[0]-h*u[1],middle[1]+h*u[0]],[middle[0]+h*u[1],middle[1]-h*u[0]]]}
  }
 }
 return uniquePoints(points.filter(p=>contains(a,p)&&contains(b,p)));
}
function cutters(geometry,options={}){
 const all=P.segments(geometry,options.rect,options.hidden);
 for(const e of options.rect?DX.cut(geometry,options.rect):geometry)if(e.type==='CIRCLE')all.push({...e,kind:'circle',uid:e.id+':0'});
 if(Number.isFinite(options.axis))all.push({kind:'line',type:'LINE',uid:'__cad_axis__',a:[0,options.axis],b:[1,options.axis],infinite:true,construction:true});
 return all;
}
function findSegment(geometry,uid,options={}){return P.segments(geometry,null,options.hidden).find(s=>s.uid===uid)}
// Converter somente o pai afetado permite editar trechos de polilinhas sem aproximar arcos.
// O remapeamento conserva seleção/ocultação de cada segmento que ganhou outro ID.
function replaceSegments(geometry,plans){
 const used=new Set(geometry.map(e=>e.id)),next=[],remap={},entities=[];
 const idFor=stem=>{let id=stem,n=1;while(used.has(id))id=stem+'_'+n++;used.add(id);return id};
 for(const e of geometry){
  const parts=e.type==='CIRCLE'?[{...e,kind:'circle'}]:DX.explode(e);
  if(!parts.some((_,j)=>plans.has(e.id+':'+j))){next.push(e);continue}
  parts.forEach((s,j)=>{
   const uid=e.id+':'+j,list=plans.has(uid)?plans.get(uid):[s],ids=[];
   list.forEach((shape,k)=>{
    const id=j===0&&k===0&&e.type!=='LWPOLYLINE'?e.id:idFor(e.id+'__cad_'+j+'_'+k);
    const entity={...clone(e),...clone(shape),id,type:shape.kind==='line'?'LINE':shape.kind==='circle'?'CIRCLE':'ARC',cadSource:uid};
    delete entity.uid;delete entity.parent;delete entity.kind;delete entity.infinite;delete entity.ray;
    next.push(entity);entities.push(entity);ids.push(id+':0');
   });remap[uid]=ids;
  });
 }
 geometry.length=0;for(const entity of next)geometry.push(entity);
 return {ok:true,remap,entities};
}
function setEndpoint(geometry,uid,which,p,options={}){
 const segment=findSegment(geometry,uid,options);if(!segment||segment.kind!=='line')return fail('Escolha uma linha reta ou um trecho reto de polilinha.');
 const shape={...segment,[which==='ini'?'a':'b']:p};
 const result=replaceSegments(geometry,new Map([[uid,[shape]]]));
 return {...result,entity:result.entities.find(e=>e.id+':0'===result.remap[uid][0]),newEndpoint:p};
}
function extendLine(geometry,uid,which,length,options={}){
 const segment=findSegment(geometry,uid,options),mm=Number(length);
 if(!segment||segment.kind!=='line')return fail('Extensão disponível em linhas retas e trechos retos de polilinhas.');
 if(which!=='ini'&&which!=='fim')return fail('Escolha a extremidade inicial ou final.');
 if(!Number.isFinite(mm)||mm<=0||mm>MAX_EXTEND)return fail('Informe extensão positiva em milímetros (até 10000).');
 const v=sub(segment.b,segment.a),d=Math.hypot(...v);if(d<=EPS)return fail('Linha sem comprimento não pode ser estendida.');
 const from=which==='ini'?segment.a:segment.b,direction=v.map(x=>(which==='ini'?-1:1)*x/d);
 return {...setEndpoint(geometry,uid,which,point(from,direction,mm),options),length:mm};
}
function extendToNext(geometry,uid,which,options={}){
 const segment=findSegment(geometry,uid,options);
 if(!segment||segment.kind!=='line')return fail('Escolha uma linha reta ou um trecho reto de polilinha.');
 if(which!=='ini'&&which!=='fim')return fail('Escolha a extremidade inicial ou final.');
 const v=sub(segment.b,segment.a),d=Math.hypot(...v);if(d<=EPS)return fail('Linha sem comprimento não pode ser estendida.');
 const from=which==='ini'?segment.a:segment.b,u=v.map(x=>(which==='ini'?-1:1)*x/d),ray={kind:'line',a:from,b:point(from,u,1),infinite:true,ray:true};
 let hit=null;
 for(const cutter of cutters(geometry,options)){if(cutter.uid===uid)continue;for(const p of intersections(ray,cutter)){const length=dot(sub(p,from),u);if(length>EPS&&length<=MAX_EXTEND&&(!hit||length<hit.length))hit={point:p,length,target:cutter.uid}}}
 if(!hit)return fail('Nenhuma linha, arco ou eixo encontrado à frente desta extremidade (até 10000 mm).');
 return {...setEndpoint(geometry,uid,which,hit.point,options),length:hit.length,target:hit.target};
}
function breakSegment(geometry,uid,options={}){
 const segment=findSegment(geometry,uid,options);if(!segment||!['line','arc'].includes(segment.kind))return fail('Escolha uma linha ou arco para quebrar nos cruzamentos.');
 const length=segment.kind==='line'?dist(segment.a,segment.b):segment.r*arcData(segment).span;if(!(length>EPS))return fail('Elemento sem comprimento.');
 const times=[];
 for(const cutter of cutters(geometry,options))if(cutter.uid!==uid)for(const p of intersections(segment,cutter)){const t=parameter(segment,p);if(t>EPS/length&&t<1-EPS/length&&!times.some(q=>Math.abs(q-t)*length<=EPS))times.push(t)}
 if(!times.length)return fail('Nenhuma interseção no interior do elemento. O eixo central também é considerado.');
 const bounds=[0,...times.sort((a,b)=>a-b),1],parts=[];
 for(let i=1;i<bounds.length;i++){
  const lo=bounds[i-1],hi=bounds[i];let shape;
  if(segment.kind==='line'){const v=sub(segment.b,segment.a);shape={...segment,a:point(segment.a,v,lo),b:point(segment.a,v,hi)}}
  else{const arc=arcData(segment),start=arc.start+arc.sign*arc.span*lo,end=arc.start+arc.sign*arc.span*hi;shape={...segment,start:mod(start)*180/Math.PI,end:mod(end)*180/Math.PI,sweep:arc.sign,a:[segment.c[0]+segment.r*Math.cos(start),segment.c[1]+segment.r*Math.sin(start)],b:[segment.c[0]+segment.r*Math.cos(end),segment.c[1]+segment.r*Math.sin(end)]}}
  parts.push(shape);
 }
 return {...replaceSegments(geometry,new Map([[uid,parts]])),pieces:parts.length};
}
function connectStraight(geometry,first,second,options={}){
 if(first===second)return fail('Clique em duas linhas diferentes.');
 const a=findSegment(geometry,first,options),b=findSegment(geometry,second,options);
 if(!a||!b||a.kind!=='line'||b.kind!=='line')return fail('Conecte duas linhas retas ou trechos retos de polilinhas.');
 const v=sub(a.b,a.a),w=sub(b.b,b.a),la=Math.hypot(...v),lb=Math.hypot(...w);if(la<=EPS||lb<=EPS)return fail('Linha sem comprimento não pode ser conectada.');
 const den=cross(v,w),plans=new Map(),changes=[];let meeting;
 if(Math.abs(den)>la*lb*1e-12)meeting=point(a.a,v,cross(sub(b.a,a.a),w)/den);
 else{
  if(Math.abs(cross(sub(b.a,a.a),v))/la>EPS)return fail('As linhas são paralelas e não têm ponto de encontro.');
  const q=[parameter(a,b.a),parameter(a,b.b)].sort((x,y)=>x-y);
  if(Math.min(1,q[1])-Math.max(0,q[0])>=-EPS/la)return fail('As linhas já se encontram ou se sobrepõem.');
  const choices=[['ini',a.a],['fim',a.b]].flatMap(([wa,pa])=>[['ini',b.a],['fim',b.b]].map(([wb,pb])=>({wa,pa,wb,pb,d:dist(pa,pb)}))).sort((x,y)=>x.d-y.d),nearest=choices[0];
  meeting=[(nearest.pa[0]+nearest.pb[0])/2,(nearest.pa[1]+nearest.pb[1])/2];
 }
 if(!meeting.every(Number.isFinite))return fail('Não foi possível calcular um encontro finito.');
 for(const [uid,s,len] of [[first,a,la],[second,b,lb]]){
  const t=parameter(s,meeting),which=t<0?'ini':t>1?'fim':null;
  if(!which)continue;
  const length=dist(which==='ini'?s.a:s.b,meeting);if(length>MAX_EXTEND)return fail('O encontro exigiria extensão maior que 10000 mm; escolha linhas mais próximas.');
  if(length<=EPS)continue;
  plans.set(uid,[{...s,[which==='ini'?'a':'b']:meeting}]);changes.push({uid,which,length});
 }
 if(!changes.length)return fail('As linhas já se encontram; nenhuma extensão é necessária.');
 return {...replaceSegments(geometry,plans),meeting,changes};
}
function support(s){return s.kind==='line'?{...s,infinite:true,ray:false}:{kind:'circle',type:'CIRCLE',c:s.c,r:s.r}}
function supportMeetings(a,b){
 const points=intersections(support(a),support(b));
 if(a.kind==='arc'&&b.kind==='arc'&&dist(a.c,b.c)<=EPS&&Math.abs(a.r-b.r)<=EPS)points.push(...DX.sample(a,1),...DX.sample(b,1));
 return uniquePoints(points);
}
function sameCircleMeeting(a,b){
 const pairs=DX.sample(a,1).flatMap(pa=>DX.sample(b,1).map(pb=>({pa,pb,d:dist(pa,pb)}))).sort((x,y)=>x.d-y.d),nearest=pairs[0];
 if(!nearest||pairs[1]&&Math.abs(pairs[1].d-nearest.d)<=EPS)return [];
 const start=Math.atan2(nearest.pa[1]-a.c[1],nearest.pa[0]-a.c[0]),end=Math.atan2(nearest.pb[1]-a.c[1],nearest.pb[0]-a.c[0]),angle=start+Math.atan2(Math.sin(end-start),Math.cos(end-start))/2;
 return [[a.c[0]+a.r*Math.cos(angle),a.c[1]+a.r*Math.sin(angle)]];
}
function arcEndpoint(s,end,p,limit=MAX_EXTEND){
 const arc=arcData(s);if(!arc||!(s.r>0)||Math.abs(dist(s.c,p)-s.r)>EPS)return null;
 const old=arc.start+(end?arc.sign*arc.span:0),angle=Math.atan2(p[1]-s.c[1],p[0]-s.c[0]);
 const delta=Math.atan2(Math.sin(arc.sign*(angle-old)),Math.cos(arc.sign*(angle-old))),span=arc.span+(end?delta:-delta),length=Math.abs(delta)*s.r;
 if(span*s.r<=EPS||span>=TAU-EPS/Math.max(s.r,1)||length>limit)return null;
 const ends=DX.sample(s,1),shape={...s,a:ends[0],b:ends[1],start:mod(end?arc.start:angle)*180/Math.PI,end:mod(end?angle:arc.start+arc.sign*arc.span)*180/Math.PI,sweep:arc.sign};
 shape[end?'b':'a']=[...p];return {shape,length,which:end?'fim':'ini',from:ends[end]};
}
function extendToMeeting(s,p){
 if(contains(s,p)){
  if(s.kind==='line'){
   const ends=[s.a,s.b],end=dist(ends[0],p)<=dist(ends[1],p)?0:1,length=dist(ends[end],p);
   if(length<=EPS)return {shape:s,length:0};
   return {shape:{...s,[end?'b':'a']:[...p]},length,which:end?'fim':'ini',from:ends[end]};
  }
  const ends=DX.sample(s,1);if(ends.some(q=>dist(q,p)<=EPS))return {shape:s,length:0};
  return [0,1].map(end=>arcEndpoint(s,end,p)).filter(Boolean).sort((a,b)=>a.length-b.length)[0]||null;
 }
 if(s.kind==='line'){
  const t=parameter(s,p),end=t<0?0:1,from=end?s.b:s.a,length=dist(from,p);
  return length<=MAX_EXTEND?{shape:{...s,[end?'b':'a']:[...p]},length,which:end?'fim':'ini',from}:null;
 }
 const arc=arcData(s),angle=Math.atan2(p[1]-s.c[1],p[0]-s.c[0]);
 const choices=[0,1].map(end=>{
  const extension=end?mod(arc.sign*(angle-arc.start))-arc.span:mod(arc.sign*(arc.start-angle));
  if(extension<0||arc.span+extension>=TAU-EPS/Math.max(s.r,1)||extension*s.r>MAX_EXTEND)return null;
  const ends=DX.sample(s,1),shape={...s,a:ends[0],b:ends[1],start:mod(end?arc.start:angle)*180/Math.PI,end:mod(end?angle:arc.start+arc.sign*arc.span)*180/Math.PI,sweep:arc.sign};
  shape[end?'b':'a']=[...p];return {shape,length:extension*s.r,which:end?'fim':'ini',from:ends[end]};
 }).filter(Boolean).sort((a,b)=>a.length-b.length);
 return choices[0]||null;
}
function shortGap(d,a,b,limit=.2){const roundoff=Math.max(1,...a.map(Math.abs),...b.map(Math.abs))*Number.EPSILON*8;return d>EPS&&d<limit-roundoff}
function bridgeEntity(geometry,a,b,reserved=new Set()){
 let id='cad_link',n=1;while(geometry.some(e=>e.id===id)||reserved.has(id))id='cad_link_'+n++;
 reserved.add(id);return {id,type:'LINE',layer:a.s.layer||b.s.layer||'PERFIL',a:[...a.p],b:[...b.p],cadRepair:{kind:'bridge',sources:[a.s.uid,b.s.uid],gap:dist(a.p,b.p)}};
}
function bridgeSafe(geometry,a,b,uids,options){
 const bridge={kind:'line',a:a.p,b:b.p},chosen=new Set(uids);
 return !P.segments(geometry,null,options.hidden).some(s=>chosen.has(s.uid)&&s.uid!==a.s.uid&&s.uid!==b.s.uid&&intersections(bridge,s).length);
}
function connectLines(geometry,first,second,options={}){
 if(first===second)return fail('Clique em duas linhas ou arcos diferentes.');
 const a=findSegment(geometry,first,options),b=findSegment(geometry,second,options);
 if(!a||!b||![a,b].every(s=>['line','arc'].includes(s.kind)))return fail('Escolha duas retas ou arcos, inclusive trechos de polilinha.');
 if(a.kind==='line'&&b.kind==='line')return connectStraight(geometry,first,second,options);
 if([a,b].some(s=>s.kind==='line'?dist(s.a,s.b)<=EPS:!(s.r>0)||arcData(s).span*s.r<=EPS))return fail('Elemento sem comprimento não pode ser conectado.');
 const meetings=a.kind==='arc'&&b.kind==='arc'&&dist(a.c,b.c)<=EPS&&Math.abs(a.r-b.r)<=EPS?sameCircleMeeting(a,b):supportMeetings(a,b);
 const candidates=meetings.map(p=>({p,ops:[extendToMeeting(a,p),extendToMeeting(b,p)]})).filter(c=>c.ops.every(o=>o&&o.length<=MAX_EXTEND)).map(c=>({...c,cost:c.ops.reduce((sum,o)=>sum+o.length,0)})).sort((a,b)=>a.cost-b.cost);
 if(candidates.length){
  const best=candidates[0];if(best.cost<=EPS)return fail('Os elementos já se encontram; nenhuma extensão é necessária.');
  if(candidates[1]&&Math.abs(candidates[1].cost-best.cost)<=EPS&&dist(best.p,candidates[1].p)>EPS)return fail('Há dois encontros igualmente próximos. Quebre os elementos para indicar o encontro desejado.');
  const plans=new Map(),changes=[],corrections=[];
  for(let j=0;j<2;j++){const op=best.ops[j],uid=[first,second][j];if(op.length<=EPS)continue;plans.set(uid,[op.shape]);changes.push({uid,which:op.which,length:op.length});corrections.push({uid,end:op.which,from:op.from,to:best.p,distance:dist(op.from,best.p),anchor:[second,first][j],kind:'endpoint'})}
  return {...replaceSegments(geometry,plans),meeting:best.p,changes,corrections};
 }
 // Círculos que não se interceptam não podem compartilhar um vértice mantendo
 // centro/raio. Para folga curta, acrescenta-se uma ligação explícita e reversível.
 const tips=DX.sample(a,1).flatMap((pa,ea)=>DX.sample(b,1).map((pb,eb)=>({a:{s:a,p:pa,end:ea},b:{s:b,p:pb,end:eb},d:dist(pa,pb)}))).sort((x,y)=>x.d-y.d),pair=tips[0];
 if(pair&&shortGap(pair.d,pair.a.p,pair.b.p)&&(!tips[1]||tips[1].d-pair.d>EPS)){
  const entity=bridgeEntity(geometry,pair.a,pair.b);geometry.push(entity);const uid=entity.id+':0';
  return {ok:true,remap:{},entities:[entity],added:[{uid,sources:[first,second]}],meeting:pair.b.p,changes:[{uid,which:'ligação',length:pair.d}],corrections:[{uid,end:'ligação',from:pair.a.p,to:pair.b.p,distance:pair.d,anchor:second,kind:'bridge'}]};
 }
 return fail('Não há encontro alcançável mantendo centros e raios, nem uma folga menor que 0,2 mm para ligação curta. Nenhum elemento foi alterado.');
}
function circularRanges(s){const arc=arcData(s),lo=mod(arc.sign<0?arc.start-arc.span:arc.start),hi=lo+arc.span;return hi<=TAU?[[lo,hi]]:[[lo,TAU],[0,hi-TAU]]}
// Mantém a maior linha inteira, inclusive em sobreposição parcial, conforme a regra de importação.
// Tolerância de 0,000001 mm; um cruzamento ou mero contato não é sobreposição.
function dedupeGeometry(geometry){
 const plans=new Map(),removed=[],groups=new Map(),segments=P.segments(geometry),circles=geometry.filter(e=>e.type==='CIRCLE').map(e=>({...e,kind:'circle',uid:e.id+':0'}));
 const entries=[...segments,...circles].map((s,index)=>({s,index,length:s.kind==='line'?dist(s.a,s.b):s.r*(arcData(s)?.span||0)})).sort((a,b)=>b.length-a.length||a.index-b.index);
 const bucket=1e-4,angleBucket=1e-6;
 for(const {s,length}of entries){
  let candidate=[],key,keys=[];
  if(s.kind==='line'&&length>EPS){
   let u=sub(s.b,s.a).map(x=>x/length);if(u[0]<-1e-10||Math.abs(u[0])<=1e-10&&u[1]<0)u=u.map(x=>-x);
   const angle=Math.round(Math.atan2(u[1],u[0])/angleBucket),offset=Math.round(cross(u,s.a)/bucket);key='l:'+angle+':'+offset;
   for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)keys.push('l:'+(angle+i)+':'+(offset+j));
  }else if(['arc','circle'].includes(s.kind)&&s.r>0){
   const x=Math.round(s.c[0]/bucket),y=Math.round(s.c[1]/bucket),r=Math.round(s.r/bucket);key=s.kind+':'+x+':'+y+':'+r;
   for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++)keys.push(s.kind+':'+(x+i)+':'+(y+j)+':'+(r+k));
  }else continue;
  for(const k of keys)candidate.push(...(groups.get(k)||[]));
  let winner=null,duplicate=false;
  for(const other of candidate){
   if(s.kind==='line'){
    const v=sub(other.b,other.a),len=Math.hypot(...v);
    if(Math.abs(cross(sub(s.a,other.a),v))/len>EPS||Math.abs(cross(sub(s.b,other.a),v))/len>EPS)continue;
    const q=[parameter(other,s.a)*len,parameter(other,s.b)*len].sort((a,b)=>a-b);
    if(Math.min(len,q[1])-Math.max(0,q[0])<=EPS)continue;
    duplicate=dist(s.a,other.a)<=EPS&&dist(s.b,other.b)<=EPS||dist(s.a,other.b)<=EPS&&dist(s.b,other.a)<=EPS;winner=other;break;
   }else if(dist(s.c,other.c)<=EPS&&Math.abs(s.r-other.r)<=EPS){
    const overlap=circularRanges(s).reduce((sum,[lo,hi])=>sum+circularRanges(other).reduce((n,[a,b])=>n+Math.max(0,Math.min(hi,b)-Math.max(lo,a)),0),0);
    if(overlap*s.r<=EPS)continue;duplicate=Math.abs(overlap*s.r-length)<=EPS&&Math.abs(length-other.r*arcData(other).span)<=EPS;winner=other;break;
   }
  }
  if(winner){plans.set(s.uid,[]);removed.push({uid:s.uid,kept:winner.uid,reason:duplicate?'duplicada':'sobreposta'})}
  else{if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)}
 }
 const result=plans.size?replaceSegments(geometry,plans):{ok:true,remap:{},entities:[]};
 return {...result,removed,duplicates:removed.filter(r=>r.reason==='duplicada').length,overlaps:removed.filter(r=>r.reason==='sobreposta').length};
}
function geometryDelta(original,working){
 const before=new Map(original.map(e=>[e.id,e])),after=new Map(working.map(e=>[e.id,e]));
 return {order:working.map(e=>e.id),removed:original.filter(e=>!after.has(e.id)).map(e=>e.id),upsert:working.filter(e=>!before.has(e.id)||JSON.stringify(e)!==JSON.stringify(before.get(e.id))).map(clone)};
}
// O ajuste legado ancora linhas, mantendo arcos intactos. Ligar falhas também
// ajusta ângulos de arcos ou acrescenta ligação curta explícita, sem mover círculos.
function endpointConnections(geometry,uids,options={}){
 const tolerance=options.tolerance===undefined ? .01 : Number(options.tolerance);
 if(!(tolerance>EPS&&tolerance<=.2))return fail('Use tolerância de conexão maior que 0 e até 0,2 mm.');
 const chosen=new Set(uids||[]),segments=P.segments(geometry,null,options.hidden).filter(s=>chosen.has(s.uid)&&['line','arc'].includes(s.kind)),tips=[];
 if(segments.length>10000)return fail('Selecione um perfil com até 10000 segmentos.');
 for(const s of segments)DX.sample(s,1).forEach((p,end)=>tips.push({s,p,end}));
 const grid=new Map(),key=(x,y)=>x+':'+y;
 tips.forEach((tip,i)=>{const k=key(Math.floor(tip.p[0]/tolerance),Math.floor(tip.p[1]/tolerance));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i)});
 const near=tips.map(tip=>{const x=Math.floor(tip.p[0]/tolerance),y=Math.floor(tip.p[1]/tolerance),matches=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of grid.get(key(x+dx,y+dy))||[]){
   if(tips[j].s.uid===tip.s.uid)continue;const d=dist(tip.p,tips[j].p),roundoff=Math.max(1,...tip.p.map(Math.abs),...tips[j].p.map(Math.abs))*Number.EPSILON*8;
   if(d<=tolerance&&(!options.strictLimit||d<tolerance-roundoff))matches.push({j,d});
  }return matches;
 });
 const components=new Map();P.connectivity(segments).groups.forEach((group,index)=>group.forEach(id=>components.set(id,index)));
 const pairs=[],ambiguous=[];
 for(let i=0;i<tips.length;i++){
  // Pontas já ligadas não são uma falha aberta. Uma ligação curta faz seus dois
  // nós ficarem próximos entre si; não deve gerar um falso aviso de ambiguidade.
  if(near[i].length>1){if(!near[i].some(q=>q.d<=.001)&&near[i].some(q=>q.d>.001))ambiguous.push({uid:tips[i].s.uid,point:tips[i].p});continue}
  if(near[i].length!==1)continue;const {j,d}=near[i][0];if(j<i||near[j].length!==1||near[j][0].j!==i||d<=EPS)continue;
  const a=tips[i],b=tips[j];if(d>.001&&components.get(a.s.uid)===components.get(b.s.uid))continue;
  pairs.push({a,b,d,repairable:a.s.kind==='line'||b.s.kind==='line'||!!options.allowArcs&&d>.001});
 }
 return {ok:true,pairs,ambiguous,tolerance};
}
function repairEndpoints(geometry,uids,options={}){
 const detected=endpointConnections(geometry,uids,options);if(!detected.ok)return detected;
 const {tolerance}=detected,plans=new Map(),corrections=[],unresolved=[],bridges=[],reserved=new Set();
 for(const {a,b,d,repairable} of detected.pairs){
  if(!repairable){if(d>.001)unresolved.push({first:a.s.uid,second:b.s.uid,distance:d});continue}
  if(a.s.kind==='arc'&&b.s.kind==='arc'){
   const sa=plans.get(a.s.uid)?.[0]||a.s,sb=plans.get(b.s.uid)?.[0]||b.s;
   const meetings=dist(sa.c,sb.c)<=EPS&&Math.abs(sa.r-sb.r)<=EPS?sameCircleMeeting(sa,sb):supportMeetings(sa,sb);
   const candidates=meetings.filter(p=>!Number.isFinite(options.axis)||p[1]>=options.axis-EPS).map(p=>({p,oa:arcEndpoint(sa,a.end,p,tolerance),ob:arcEndpoint(sb,b.end,p,tolerance)})).filter(c=>c.oa&&c.ob&&(!options.strictLimit||[[c.oa,a],[c.ob,b]].every(([o,tip])=>shortGap(o.length,tip.p,c.p,tolerance)||o.length<=EPS))).map(c=>({...c,cost:c.oa.length+c.ob.length})).sort((x,y)=>x.cost-y.cost);
   const best=candidates[0];
   if(best&&(!candidates[1]||candidates[1].cost-best.cost>EPS||dist(best.p,candidates[1].p)<=EPS)){
    for(const [tip,op] of [[a,best.oa],[b,best.ob]])if(op.length>EPS){plans.set(tip.s.uid,[op.shape]);corrections.push({uid:tip.s.uid,end:tip.end?'fim':'ini',from:tip.p,to:best.p,distance:dist(tip.p,best.p),anchor:tip===a?b.s.uid:a.s.uid,kind:'arc-endpoint'})}
   }else{
    if(!bridgeSafe(geometry,a,b,uids,options)){unresolved.push({first:a.s.uid,second:b.s.uid,distance:d,reason:'A ligação cruzaria outro elemento selecionado.'});continue}
    const entity=bridgeEntity(geometry,a,b,reserved);bridges.push({entity,sources:[a.s.uid,b.s.uid]});corrections.push({uid:entity.id+':0',end:'ligação',from:a.p,to:b.p,distance:d,anchor:b.s.uid,kind:'bridge'});
   }
   continue;
  }
  const anchor=a.s.kind==='arc'?a:b.s.kind==='arc'?b:a,target=anchor===a?b:a;
  let shape=plans.get(target.s.uid)?.[0]||{...target.s,a:[...target.s.a],b:[...target.s.b]};shape[target.end?'b':'a']=[...anchor.p];plans.set(target.s.uid,[shape]);
  corrections.push({uid:target.s.uid,end:target.end?'fim':'ini',from:target.p,to:[...anchor.p],distance:d,anchor:anchor.s.uid});
 }
 if(!corrections.length)return {...fail('Nenhuma folga entre linhas e vértices pôde ser ajustada até '+tolerance.toFixed(3)+' mm. Selecione o perfil completo; bifurcações e folgas maiores exigem revisão.'),unresolved};
 for(const [uid,[s]] of plans)if(dist(s.a,s.b)<=EPS)return fail('O ajuste eliminaria o comprimento do elemento '+uid+'. Nenhum elemento foi alterado.');
 const result=replaceSegments(geometry,plans);geometry.push(...bridges.map(b=>b.entity));
 return {...result,entities:[...result.entities,...bridges.map(b=>b.entity)],added:bridges.map(b=>({uid:b.entity.id+':0',sources:b.sources})),corrections,unresolved,maxDistance:Math.max(...corrections.map(c=>c.distance)),tolerance};
}
function linkGaps(geometry,uids,options={}){return repairEndpoints(geometry,uids,{...options,tolerance:.2,strictLimit:true,allowArcs:true})}
function restoreGeometry(original,delta){
 if(!delta||!Array.isArray(delta.order)||!Array.isArray(delta.removed)||!Array.isArray(delta.upsert))throw Error('Alterações geométricas do rascunho inválidas. O original foi preservado.');
 const entries=new Map(original.map(e=>[e.id,clone(e)]));for(const id of delta.removed)entries.delete(id);for(const e of delta.upsert)entries.set(e.id,clone(e));
 if(new Set(delta.order).size!==delta.order.length||delta.order.some(id=>!entries.has(id)))throw Error('IDs das alterações geométricas inconsistentes.');
 return delta.order.map(id=>entries.get(id));
}
return {intersections,extendLine,extendToNext,breakSegment,connectLines,dedupeGeometry,endpointConnections,repairEndpoints,linkGaps,geometryDelta,restoreGeometry};
});
