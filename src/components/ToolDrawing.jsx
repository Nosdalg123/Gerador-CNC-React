import React from 'react';
import {Prog,programTool,programOrientation} from '../domain.mjs';
import {svgFerr} from '../assets/tool-drawing.mjs';
export default function ToolDrawing({tool,state,tools,reference}){
  if(reference)tool=programTool(state,tools,reference);
  const shape=Prog.formaFerr(tool,reference?programOrientation(state,reference,tool):tool?.orient);
  return <div className="tool-diagram" data-tool-kind={shape.kind}><div dangerouslySetInnerHTML={{__html:svgFerr(shape)}}/><p className="muted">{tool?.pastilha||tool?.nome||'Pastilha padrão de 80°'} · {shape.kind}{shape.largura?' · '+shape.largura+' mm':''}{shape.raio?' · raio '+shape.raio+' mm':''}{shape.ap?' · suporte κ '+shape.ap+'°':''}</p>{reference&&tool&&globalThis.CNC.tcode(tool.t)!==reference.codigo&&<p className="message warning">A ferramenta selecionada tem código T{globalThis.CNC.tcode(tool.t)}, diferente de T{reference.codigo} no programa.</p>}</div>;
}
