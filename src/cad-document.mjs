import {emptyDrawing,clone,uid} from './data.mjs';
import {createOppositeCadSide} from './cad-sides.mjs';

// A orientação editada pode ser qualquer lado. A identidade do desenho é preservada.
export function cadDocument(data){
 const existing=data.editingDrawing,side=data.cadSide||'1';
 const d={...emptyDrawing(),...clone(existing||{}),nome:data.nome,lPeca:data.lPeca,dRef:data.dRef,
  cadOrigem:{...clone(existing?.cadOrigem||{}),...clone(data.cadOrigem||{})},lados:'1',trechos1:[],trechos2:[],internos1:[],internos2:[]};
 for(const item of data.items||[]){const {side:target,...values}=item;d[(item.tipo.startsWith('i')||item.tipo==='furo'?'internos':'trechos')+(target||'1')].push({...values,id:values.id||uid('e')})}
 if(!data.cadDuplo){delete d.cadDuplo;return d}
 const next=createOppositeCadSide(d);
 if(side==='2')for(const prefix of ['trechos','internos'])[next[prefix+'1'],next[prefix+'2']]=[next[prefix+'2'],next[prefix+'1']];
 next.cadDuplo={...next.cadDuplo,...clone(data.cadDuplo),modo:'invertido'};
 for(const prefix of ['trechos','internos'])for(const s of ['1','2'])next[prefix+s].forEach((item,index)=>{const old=existing?.[prefix+s]?.[index];if(old?.id&&old.tipo===item.tipo)item.id=old.id});
 return next;
}
