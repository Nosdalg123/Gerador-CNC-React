/* Ordenação da meia seção selecionada e transformação exata CAD -> Z/raio. */
(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./dxfcore.js'),require('./cadprofile.js'));else root.CNCDXFTorno=factory(root.CNCDXF,root.CNCPerfilCAD);
})(typeof self!=='undefined'?self:this,function(DX,CAD){
'use strict';
const JOIN=.001,dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function build(segments,axis,face){
 if(!segments?.length||!Number.isFinite(axis)||!['direita','esquerda'].includes(face))return {ok:false,problems:['Selecione o perfil superior, indique o eixo e a face Z0.']};
 const nodes=[],edges=[],grid=new Map();
 const node=p=>{const bx=Math.floor(p[0]/JOIN),by=Math.floor(p[1]/JOIN);for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const i of grid.get(x+':'+y)||[])if(dist(nodes[i].p,p)<=JOIN)return i;const n=nodes.length,k=bx+':'+by;nodes.push({p,edges:[]});if(!grid.has(k))grid.set(k,[]);grid.get(k).push(n);return n};
 for(const s of segments){const ends=DX.sample(s,1);if(ends.length!==2||!['line','arc'].includes(s.kind))return {ok:false,problems:['Curva CAD sem tradução exata.']};const i=edges.length,a=node(ends[0]),b=node(ends[1]);if(a===b)return {ok:false,problems:['Elemento CAD fechado ou sem comprimento.']};edges.push({s,a,b,ends});nodes[a].edges.push(i);nodes[b].edges.push(i)}
 const tips=nodes.map((n,i)=>({n,i})).filter(q=>q.n.edges.length===1);
 if(tips.length!==2||nodes.some(n=>n.edges.length>2)){
  const branches=nodes.filter(n=>n.edges.length>2),near=[];
  for(let i=0;i<Math.min(tips.length,32);i++)for(let j=i+1;j<tips.length;j++){const d=dist(tips[i].n.p,tips[j].n.p);if(d>JOIN&&d<.2)near.push({distance:d,first:edges[tips[i].n.edges[0]].s.uid,second:edges[tips[j].n.edges[0]].s.uid,points:[tips[i].n.p,tips[j].n.p]})}
  near.sort((a,b)=>a.distance-b.distance);
  const problems=['Continuidade geométrica de 0,001 mm: '+tips.length+' pontas e '+branches.length+' bifurcações. O perfil precisa ter duas pontas e nenhuma bifurcação.'];
  for(const g of near.slice(0,4))problems.push('Folga de '+g.distance.toLocaleString('pt-BR',{minimumFractionDigits:6,maximumFractionDigits:6})+' mm entre '+g.first+' e '+g.second+'. Use Ligar falhas ou revise as extremidades.');
  return {ok:false,problems,nearGaps:near};
 }
 tips.sort((a,b)=>face==='direita'?b.n.p[0]-a.n.p[0]:a.n.p[0]-b.n.p[0]);let cur=tips[0].i,seen=new Set(),ordered=[];
 while(ordered.length<edges.length){const index=nodes[cur].edges.find(i=>!seen.has(i));if(index===undefined)break;seen.add(index);const e=edges[index],reverse=e.b===cur;ordered.push({s:e.s,reverse,a:e.ends[reverse?1:0],b:e.ends[reverse?0:1]});cur=reverse?e.a:e.b}
 if(seen.size!==edges.length)return {ok:false,problems:['Há mais de uma cadeia na seleção superior.']};
 const x0=tips[0].n.p[0],sign=face==='direita'?1:-1,coord=p=>[(p[0]-x0)*sign||0,p[1]-axis||0];
 const path=ordered.map(({s,reverse,a,b})=>({kind:s.kind,a:coord(a),b:coord(b),sourceId:s.uid,...(s.kind==='arc'?{c:coord(s.c),r:s.r,ccw:((s.sweep===undefined||s.sweep>0)!==reverse)!==(sign<0)}:{})}));
 const info=CAD.validate(path);return {...info,path,sourceFace:x0,axis,face};
}
return {build};
});
