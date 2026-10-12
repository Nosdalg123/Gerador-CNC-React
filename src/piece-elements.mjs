import { CNC, ELEMENTS } from './domain.mjs';
import { clone, uid } from './data.mjs';
import { elementDefinitions } from './assets/element-drawings.mjs';

export const isCorner = type => ['raio','chanfro','iraio','ichanfro'].includes(type);
export const isInternal = type => elementDefinitions[type]?.g === 'int';
export const elementFields = item => {
  const labels = elementDefinitions[item.tipo]?.rot || ELEMENTS[item.tipo]?.[1] || [];
  if (['canal','icanal'].includes(item.tipo) && item.seq) return labels.map((label,i)=>({key:['a','c'][i],label}));
  if (['canal','icanal'].includes(item.tipo)) return ['Ø do fundo','Posição Z','Largura'].map((label,i)=>({key:['a','b','c'][i],label}));
  return labels.map((label,i)=>({key:['a','b','c'][i],label}));
};
export function newElement(type, items) {
  const item={id:uid('e'),tipo:type,...clone(elementDefinitions[type].d)};
  const internal=isInternal(type),previous=items.filter(x=>internal?['icil','icone','irosca'].includes(x.tipo):['cil','cone','rosca'].includes(x.tipo)).at(-1);
  if(previous){const diam=previous.tipo.includes('cone')?Number(previous.b):previous.tipo==='irosca'?CNC.psRoscaD1(Number(previous.a),Number(previous.c)):Number(previous.a);
    if(type==='cil'||type==='icil')item.a=diam;
    if(type==='cone'||type==='icone'){item.a=diam;item.b=internal?Math.max(1,diam-6):diam+10;}
    if(type==='rosca')item.a=diam;
    if(type==='irosca')item.a=diam+2;
    if(type==='canal')item.a=Math.max(1,diam-6);
    if(type==='icanal')item.a=diam+6;
  }
  return item;
}
export function elementCursor(items,index=items.length){return items.slice(0,index).reduce((z,it)=>z+(['cil','icil','rosca','irosca'].includes(it.tipo)?Number(it.b)||0:it.tipo.includes('cone')?Number(it.c)||0:['canal','icanal'].includes(it.tipo)&&it.seq?Number(it.c)||0:0),0);}
export function applyElement(drawing,side,item,index=-1){const key=(isInternal(item.tipo)?'internos':'trechos')+side,list=drawing[key]||[],next=list.map(x=>clone(x));if(index<0)next.push(clone(item));else next[index]=clone(item);return {...drawing,[key]:next};}
export function elementSummary(item){const name=elementDefinitions[item.tipo]?.nome||item.tipo,n=CNC.fmt;
  if(isCorner(item.tipo))return name+' '+(item.tipo.includes('raio')?'R':'C')+n(item.a);
  if(item.tipo.includes('cone'))return name+' · Ø'+n(item.a)+' → Ø'+n(item.b)+' × '+n(item.c)+' mm';
  if(item.tipo==='furo')return name+' · Ø'+n(item.a)+' × '+n(item.b)+' mm de profundidade';
  if(item.tipo.includes('canal'))return name+' · Ø'+n(item.a)+' · largura '+n(item.c)+(item.seq?' · sequencial':' · Z'+n(item.b));
  if(item.tipo.includes('rosca'))return name+' · M'+n(item.a)+'×'+n(item.c)+' · '+n(item.b)+' mm';
  return name+' · Ø'+n(item.a)+' × '+n(item.b)+' mm';
}
