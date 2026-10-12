const copy=value=>structuredClone(value),EPS=1e-6;
function checked(path){const info=globalThis.CNCPerfilCAD.validate(path);if(!info.ok)throw Error(info.problems.join(' · '));return info;}
export function reverseCadPath(path,length){
 const info=checked(path);if(Math.abs(info.length-length)>.001)throw Error('O comprimento final difere do contorno CAD.');
 const flip=p=>[-length-p[0]||0,p[1]];
 const result=copy(path).reverse().map(s=>({...s,a:flip(s.b),b:flip(s.a),...(s.kind==='arc'?{c:flip(s.c)}:{})}));
 checked(result);return result;
}
export function clipCadPath(path,length){
 const info=checked(path);length=Number(length);if(!Number.isFinite(length)||length<=0||length>info.length+EPS)throw Error('Informe um comprimento de usinagem maior que zero e até '+info.length+' mm.');
 const result=[],cut=-length;
 for(const original of path){
  const s=copy(original);if(s.a[0]<cut-EPS)break;
  if(s.b[0]>=cut-EPS){result.push(s);continue}
  if(s.a[0]<=cut+EPS)break;
  if(s.kind==='line'){const t=(cut-s.a[0])/(s.b[0]-s.a[0]);s.b=[cut,s.a[1]+t*(s.b[1]-s.a[1])];}
  else{
   const arc=globalThis.CNCPerfilCAD.arcInfo(s);let lo=0,hi=arc.span;
   for(let i=0;i<60;i++){const mid=(lo+hi)/2,z=s.c[0]+s.r*Math.cos(arc.start+arc.sign*mid);if(z>cut)lo=mid;else hi=mid;}
   const angle=arc.start+arc.sign*(lo+hi)/2;s.b=[s.c[0]+s.r*Math.cos(angle),s.c[1]+s.r*Math.sin(angle)];
  }
  result.push(s);break;
 }
 checked(result);return result;
}
function reverseInternals(items,length){
 if(!items.length)return [];
 if(items.length===1&&items[0].tipo==='furo'&&Number(items[0].b)>=length-EPS)return copy(items);
 if(items.some(t=>!['icil','icone'].includes(t.tipo))||Math.abs(items.reduce((n,t)=>n+Number(t.tipo==='icil'?t.b:t.c),0)-length)>.001)throw Error('O perfil interno é parcial ou contém operações que precisam de preparação própria no lado 2. Configure esse lado separadamente; o desenho atual foi preservado.');
 return copy(items).reverse().map(t=>({...t,...(t.tipo==='icone'?{a:t.b,b:t.a}:{}),id:(t.id||'interno')+'-lado2'}));
}
export function createOppositeCadSide(drawing){
 const d=copy(drawing),item=d.trechos1?.find(t=>t.tipo==='cadperfil');if(!item||d.trechos1.length!==1)throw Error('A inversão automática exige um contorno CAD nativo completo no lado 1.');
 const length=Number(d.lPeca);d.trechos2=[{...copy(item),id:(item.id||'cad')+'-lado2',path:reverseCadPath(item.path,length)}];d.internos2=reverseInternals(d.internos1||[],length);d.lados='2';
 d.cadDuplo={...d.cadDuplo,modo:'invertido',primeiro:d.cadDuplo?.primeiro||'1'};return d;
}
function clipInternals(items,length){
 let used=0;const result=[];
 for(const original of items){const t=copy(original);if(t.tipo==='furo'){t.b=Math.min(Number(t.b),length);result.push(t);continue}
  const depth=Number(t.tipo==='icil'?t.b:t.c),take=Math.min(depth,length-used);if(take<=EPS)break;
  if(t.tipo==='icone'){t.b=Number(t.a)+(Number(t.b)-Number(t.a))*take/depth;t.c=take}else t.b=take;
  result.push(t);used+=take;
 }return result;
}
export function cadMachiningLimits(drawing,settings={}){
 const half=Number(drawing.lPeca)/2;
 return Object.fromEntries(['1','2'].map(side=>['limite'+side,settings['limite'+side]??drawing.cadDuplo?.['limite'+side]??half]));
}
export function prepareCadSides(drawing,first='1',settings={}){
 const d=copy(drawing),length=Number(d.lPeca);
 d.cadDuplo={...d.cadDuplo,...cadMachiningLimits(drawing,settings)};
 const expected=reverseCadPath(d.trechos1?.[0]?.path,length),opposite=d.trechos2?.[0]?.path;
 const samePoint=(a,b)=>Array.isArray(b)&&Math.hypot(a[0]-b[0],a[1]-b[1])<=.001;
 if(!opposite||opposite.length!==expected.length||expected.some((s,i)=>{const t=opposite[i];return s.kind!==t.kind||!samePoint(s.a,t.a)||!samePoint(s.b,t.b)||(s.kind==='arc'&&(!samePoint(s.c,t.c)||Math.abs(s.r-t.r)>.001||s.ccw!==t.ccw))}))throw Error('Os contornos dos lados não correspondem à mesma peça invertida. Confira a edição no CAD antes de gerar.');
 for(const side of ['1','2']){
  const item=d['trechos'+side]?.find(t=>t.tipo==='cadperfil');if(!item)throw Error('Contorno CAD do lado '+side+' ausente.');
  d['trechos'+side]=[{...item,path:clipCadPath(item.path,d.cadDuplo['limite'+side])}];d['internos'+side]=clipInternals(d['internos'+side]||[],Number(d.cadDuplo['limite'+side]));
 }
 if(Number(d.cadDuplo.limite1)+Number(d.cadDuplo.limite2)<length-.001)throw Error('Os comprimentos dos lados 1 e 2 deixam uma faixa sem usinar. Ajuste os limites para cobrir os '+length+' mm da peça.');
 if(first==='2')for(const prefix of ['trechos','internos'])[d[prefix+'1'],d[prefix+'2']]=[d[prefix+'2'],d[prefix+'1']];
 return d;
}
