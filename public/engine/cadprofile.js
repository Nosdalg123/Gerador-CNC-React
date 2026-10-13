/* Contorno CAD nativo em Z/raio. Arcos circulares permanecem arcos, sem virar retas CNC. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory();else root.CNCPerfilCAD=factory();
})(typeof self!=='undefined'?self:this,function(){
'use strict';
const EPS=1e-6,JOIN=.001,TAU=2*Math.PI,mod=a=>((a%TAU)+TAU)%TAU;
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]),finite=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
function arcInfo(s){const start=Math.atan2(s.a[1]-s.c[1],s.a[0]-s.c[0]),end=Math.atan2(s.b[1]-s.c[1],s.b[0]-s.c[0]),sign=s.ccw?1:-1;return {start,sign,span:mod(sign*(end-start))}}
function sample(s,n=32){if(s.kind==='line')return [s.a,s.b];const a=arcInfo(s);return Array.from({length:n+1},(_,i)=>{const t=a.start+a.sign*a.span*i/n;return [s.c[0]+s.r*Math.cos(t),s.c[1]+s.r*Math.sin(t)]})}
function extrema(s){const points=[s.a,s.b];if(s.kind==='arc'){const a=arcInfo(s);for(const t of [0,Math.PI/2,Math.PI,3*Math.PI/2])if(mod(a.sign*(t-a.start))<=a.span+EPS)points.push([s.c[0]+s.r*Math.cos(t),s.c[1]+s.r*Math.sin(t)])}return points}
function validate(path){
 const problems=[];if(!Array.isArray(path)||!path.length||path.length>10000)return {ok:false,problems:['Selecione um contorno CAD com até 10000 segmentos.']};
 for(let i=0;i<path.length;i++){
  const s=path[i];if(!s||!['line','arc'].includes(s.kind)||!finite(s.a)||!finite(s.b)){problems.push('Segmento CAD inválido.');continue}
  if(dist(s.a,s.b)<=EPS){problems.push('Segmento CAD sem comprimento.');continue}
  if(s.kind==='arc'&&(!finite(s.c)||!(s.r>0&&Number.isFinite(s.r))||typeof s.ccw!=='boolean'||Math.abs(dist(s.a,s.c)-s.r)>JOIN||Math.abs(dist(s.b,s.c)-s.r)>JOIN)){problems.push('Arco CAD com centro/raio inconsistente.');continue}
  if(i&&finite(path[i-1]?.b)&&dist(path[i-1].b,s.a)>JOIN)problems.push('Contorno CAD desconectado: confira as extremidades.');
  const ex=extrema(s);if(ex.some(p=>p[1]<-EPS))problems.push('Contorno abaixo do eixo central: use somente a metade superior.');
  if(s.kind==='line'&&s.b[0]>s.a[0]+EPS)problems.push('Contorno volta em Z: confira a orientação e remova retornos axiais.');
  const prev=path[i-1];if(s.kind==='line'&&prev?.kind==='line'&&Math.abs(s.b[0]-s.a[0])<=EPS&&Math.abs(prev.b[0]-prev.a[0])<=EPS&&(s.b[1]-s.a[1])*(prev.b[1]-prev.a[1])<0)problems.push('Faces radiais sobrepostas: remova o retorno sobre a mesma linha.');
  if(s.kind==='arc'){const a=arcInfo(s),critical=[0,a.span];for(const t of [0,Math.PI]){const v=mod(a.sign*(t-a.start));if(v>EPS&&v<a.span-EPS)critical.push(v)}critical.sort((x,y)=>x-y);for(let j=1;j<critical.length;j++){const t=a.start+a.sign*(critical[j]+critical[j-1])/2;if(-a.sign*Math.sin(t)>EPS)problems.push('Arco volta em Z: esta curva exige outra estratégia de usinagem.')}}
 }
 if(!problems.length&&Math.abs(path[0].a[0])>JOIN)problems.push('A face do contorno CAD deve começar em Z0.');
 if(problems.length)return {ok:false,problems:[...new Set(problems)]};
 const points=path.flatMap(extrema),length=-Math.min(...points.map(p=>p[0])),radius=Math.max(...points.map(p=>p[1]));
 if(!(length>EPS&&radius>EPS))problems.push('O contorno precisa de comprimento e diâmetro positivos.');
 return {ok:!problems.length,problems,length,radius};
}
function splitArcs(path){return path.flatMap(s=>{if(s.kind==='line')return [{...s,a:[...s.a],b:[...s.b]}];const arc=arcInfo(s),count=Math.ceil(arc.span/(Math.PI/2)),points=sample(s,count);return Array.from({length:count},(_,i)=>({...s,a:i?points[i]:s.a,b:i===count-1?s.b:points[i+1]}))})}
function monotonicRadius(path){
 let up=false,down=false;const direction=d=>{up=up||d>EPS;down=down||d<-EPS};
 for(const s of path){if(s.kind==='line'){direction(s.b[1]-s.a[1]);continue}const a=arcInfo(s),cuts=[0,a.span];for(const t of [Math.PI/2,3*Math.PI/2]){const v=mod(a.sign*(t-a.start));if(v>EPS&&v<a.span-EPS)cuts.push(v)}cuts.sort((x,y)=>x-y);for(let i=1;i<cuts.length;i++)direction(a.sign*Math.cos(a.start+a.sign*(cuts[i-1]+cuts[i])/2))}
 return !(up&&down);
}
// A estratégia externa atual entra pela face e não desbasta bolsões atrás de um ombro.
// A geometria continua válida/salva; somente a liberação do percurso é bloqueada.
function machiningSafety(path){
 const info=validate(path);if(!info.ok)return {ok:false,problems:info.problems};
 for(let i=0;i<path.length;i++){
  const s=path[i],points=[s.a];
  if(s.kind==='arc'){
   const arc=arcInfo(s),cuts=[];
   for(const t of [Math.PI/2,3*Math.PI/2]){const v=mod(arc.sign*(t-arc.start));if(v>EPS&&v<arc.span-EPS)cuts.push(v)}
   cuts.sort((a,b)=>a-b).forEach(v=>{const t=arc.start+arc.sign*v;points.push([s.c[0]+s.r*Math.cos(t),s.c[1]+s.r*Math.sin(t)])});
  }
  points.push(s.b);
  for(let k=1;k<points.length;k++)if(points[k][1]<points[k-1][1]-JOIN){
   const p=points[k-1],depth=Math.max(0,-p[0]),limit=Math.floor(depth*1000)/1000;
   return {ok:false,index:i,sourceId:s.sourceId,point:p,limit,problems:['Risco de colisão no contorno CAD a partir de Z-'+limit+' mm: rampa, face reversa ou fresta atrás de material que o desbaste atual não remove. O acabamento/faceamento desse trecho foi bloqueado. '+(limit>0?'Reduza o comprimento deste lado para no máximo '+limit+' mm e trabalhe o restante pela outra face.':'Use a outra face ou prepare uma operação própria para esse rebaixo.')+' Para usinar a fresta, é necessária uma estratégia e ferramenta próprias; trocar apenas G71/G72/G73 não libera este trecho.']};
  }
 }
 return {ok:true,problems:[]};
}
function compile(path,stock,mode,fmt){
 const info=validate(path);if(!info.ok)return {...info,moves:[],pts:[],pieces:[],defs:[],calcs:[],canais:[]};
 if(mode==='G72'&&!monotonicRadius(path))return {ok:false,problems:['O contorno CAD sobe e desce em X e não é compatível com G72. Escolha desbaste longitudinal (G71) ou paralelo ao perfil (G73).'],moves:[],pts:[],pieces:[],defs:[],calcs:[],canais:[]};
 if(info.radius>stock+EPS)return {ok:false,problems:['O contorno CAD ultrapassa o diâmetro bruto.'],moves:[],pts:[],pieces:[],defs:[],calcs:[],canais:[]};
 const segments=splitArcs(path),moves=[],points=[],first=segments[0].a,add=(code,key,g,from,to,R)=>moves.push({code,key,g,from,to,R});
 // Ambos os eixos no bloco P identificam o contorno G71 tipo II; geometria antiga não muda.
 if(mode==='G72'){add('N1G0Z1','psn1','G0',null,[1,stock]);add('G1X'+fmt(2*first[1])+'Z0F#7','psz0','G1',[1,stock],first)}
 else{add('N1G0X'+fmt(2*first[1])+'Z1','psn1','G0',null,[1,first[1]]);add('G1Z0F#7','psz0','G1',[1,first[1]],first)}
 points.push(first);
 segments.forEach((s,i)=>{
  if(i&&dist(segments[i-1].b,s.a)>EPS){add('G1X'+fmt(2*s.a[1])+'Z'+fmt(s.a[0]),'cadjoin'+i,'G1',segments[i-1].b,s.a);points.push(s.a)}
  const g=s.kind==='line'?'G1':s.ccw?'G3':'G2';add(g+'X'+fmt(2*s.b[1])+'Z'+fmt(s.b[0])+(s.kind==='arc'?'R'+fmt(s.r):''),'cad'+i,g,s.a,s.b,s.r);points.push(...sample(s,48).slice(1));
 });
 const last=segments.at(-1).b;add('N2G0X#1','psn2','G0',last,[last[0],stock]);
 return {ok:true,native:true,segmentCount:path.length,arcCount:path.filter(s=>s.kind==='arc').length,defs:[],calcs:[],moves,pts:points,canais:[],pieces:[],zEnd:info.length,somaL:info.length,hMax:info.radius};
}
return {validate,sample,extrema,arcInfo,compile,machiningSafety};
});
