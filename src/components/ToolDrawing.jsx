import React from 'react';
import {Prog,programGeometry,programOrientation} from '../domain.mjs';
import {svgFerr} from '../assets/tool-drawing.mjs';
import {validateToolGeometry} from '../tool-geometry-fields.mjs';
export default function ToolDrawing({tool,state,tools,reference}){
  if(reference){try{tool=programGeometry(state,tools,reference)}catch{tool=undefined}}
  if(reference&&!tool)return <div className="tool-diagram"><p className="message warning">Geometria não associada. Selecione a ferramenta usada em T{reference.codigo} para conferir o inserto.</p></div>;
  const invalid=tool&&validateToolGeometry(tool);
  if(invalid)return <div className="tool-diagram"><p className="message warning">{invalid}</p></div>;
  const shape=Prog.formaFerr(tool,reference?programOrientation(state,reference,tool):tool?.orient);
  return <div className="tool-diagram" data-tool-kind={shape.kind} data-vertical={shape.holderOrientation==='vertical'||['canalext','rosca'].includes(shape.kind)}><div dangerouslySetInnerHTML={{__html:svgFerr(shape,{physical:!!reference})}}/><p className="muted">{tool?.formatoInserto&&tool.formatoInserto!=='auto'?tool.formatoInserto+' · ':''}{tool?.pastilha||tool?.nome||'Pastilha padrão de 80°'} · {shape.kind}{shape.largura?' · '+shape.largura+' mm':''}{shape.raioPerfil?' · raio do corte '+shape.raioPerfil+' mm':''}{shape.raio?' · raio '+shape.raio+' mm':''}{shape.ap?' · suporte κ '+shape.ap+'°':''}</p>{reference&&tool&&<p className="muted">Geometria associada a T{reference.codigo} neste trabalho. Mesma orientação da animação.</p>}</div>;
}
