import React from 'react';
import drawings from '../assets/dimensioned-drawings.json';
export default function DimensionedDrawing({generator,values,numeric,onChange}) {
  const drawing=drawings[generator.desenho];if(!drawing)return null;
  const [width,height]=drawing.vb||[340,320],derived=generator.desenhoDerivados?.(numeric)||{};
  const position=pos=>({left:100*pos[0]/width+'%',top:100*pos[1]/height+'%'});
  return <figure className="dimensioned-figure"><div className={'dimensioned-drawing '+(drawing.cls||'')} style={{aspectRatio:`${width}/${height}`}}>
    <div className="dimensioned-svg" dangerouslySetInnerHTML={{__html:drawing.svg}}/>
    {generator.campos.filter(c=>c.pos).map(c=><label className="dimensioned-field" key={c.id} style={position(c.pos)} title={[c.label,c.unit,c.hint].filter(Boolean).join(' · ')}><span>{c.letra}</span><input aria-label={c.letra+' - '+c.label} type="number" step="any" inputMode="decimal" value={Number.isNaN(values[c.id])?'':values[c.id]??''} onChange={e=>onChange(c.id,e.target.value)}/></label>)}
    {Object.entries(drawing.extra).map(([key,pos])=><label className="dimensioned-field calculated" key={key} style={position(pos)} title="Calculado"><span>{key}</span><input aria-label={key+' (calculado)'} readOnly value={derived[key]??''}/></label>)}
  </div><figcaption>{drawing.legenda}. Medidas em mm, ângulos em graus; croqui esquemático.</figcaption></figure>;
}
