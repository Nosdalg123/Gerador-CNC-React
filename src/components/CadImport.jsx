import React,{useEffect,useRef,useState} from 'react';
import panel from '../assets/cad-panel.html?raw';
import '../assets/cad.css';
import {emptyDrawing,uid,clone} from '../data.mjs';
import {createOppositeCadSide} from '../cad-sides.mjs';
const panelMarkup={__html:panel};
function drawing(data){const d={...emptyDrawing(),nome:data.nome,lPeca:data.lPeca,dRef:data.dRef,cadOrigem:clone(data.cadOrigem)};for(const item of data.items||[]){const {side,...values}=item;d[(item.tipo.startsWith('i')?'internos':'trechos')+(side||'1')].push({...values,id:uid('e')})}if(data.cadDuplo){const next=createOppositeCadSide(d);if(data.cadSide==='2')for(const prefix of ['trechos','internos'])[next[prefix+'1'],next[prefix+'2']]=[next[prefix+'2'],next[prefix+'1']];next.cadDuplo=clone(data.cadDuplo);return next}return d}
export default function CadImport({workspace,update,onSave,onManual,onBack,active}){
 const current=useRef({workspace,update,onSave,onManual,onBack});current.current={workspace,update,onSave,onManual,onBack};const drafts=useRef(workspace.cadDrafts||[]);drafts.current=workspace.cadDrafts||[];const [error,setError]=useState('');
 useEffect(()=>{
  // A interface CAD da base 2.15 é montada como módulo isolado; o React controla o banco e a navegação.
  globalThis.CNCDXFDrafts={get:()=>clone(drafts.current),set:next=>{drafts.current=clone(next);current.current.update(w=>({...w,cadDrafts:clone(next)}))}};
  globalThis.CNCDesenhos={salvarPDF:data=>{const d=drawing(data);current.current.onSave(d);return d.id},importarPDF:data=>{current.current.onManual(drawing(data));return true}};
  const script=document.createElement('script');script.src='./engine/dxfimport.js';script.onload=()=>{document.getElementById('dxfModo').click();document.getElementById('dxfVoltar').addEventListener('click',()=>current.current.onBack())};script.onerror=()=>setError('Não foi possível carregar o editor CAD local.');document.body.appendChild(script);
  return()=>{script.remove();delete globalThis.CNCDesenhos;delete globalThis.CNCDXFDrafts;delete globalThis.CNCDXFImport};
 },[]);
 useEffect(()=>{globalThis.CNCDXFImport?.refreshDrafts()},[workspace.cadDrafts]);
 useEffect(()=>{if(active&&globalThis.CNCDXFImport)document.getElementById('dxfModo')?.click()},[active]);
 return <div className="cad-host"><div className="page-heading"><div><h1>Editor CAD DXF</h1><p>Entrada do DXF, edição do contorno e salvamento em três etapas.</p></div></div>{error&&<p className="message error">{error}</p>}<div hidden><button id="dxfModo"/><div id="pdfPanel"/><div id="pdfManual"/></div><div dangerouslySetInnerHTML={panelMarkup}/></div>;
}
