import React from 'react';
import {Prog,programGeometry,programOrientation} from '../domain.mjs';
import {svgFerr} from '../assets/tool-drawing.mjs';
export default function ToolDrawing({tool,state,tools,reference}){
  if(reference){try{tool=programGeometry(state,tools,reference)}catch{tool=undefined}}
  const shape=Prog.formaFerr(tool,reference?programOrientation(state,reference,tool):tool?.orient);
  return <div className="tool-diagram" data-tool-kind={shape.kind}><div dangerouslySetInnerHTML={{__html:svgFerr(shape)}}/><p className="muted">{tool?.pastilha||tool?.nome||'Pastilha padrão de 80°'} · {shape.kind}{shape.largura?' · '+shape.largura+' mm':''}{shape.raio?' · raio '+shape.raio+' mm':''}{shape.ap?' · suporte κ '+shape.ap+'°':''}</p>{reference&&tool&&<p className="muted">Geometria associada a T{reference.codigo} neste trabalho.</p>}</div>;
}
