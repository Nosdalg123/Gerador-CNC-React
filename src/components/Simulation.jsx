import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Prog,Sim,Diag } from '../domain.mjs';
import { Messages,Card } from './Common.jsx';
import {simulationViewport} from '../simulation-view.mjs';
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
function draw(canvas,sim,showPath,zoom){
  const ctx=canvas.getContext('2d'),W=1000,H=460;canvas.width=W;canvas.height=H;ctx.fillStyle='#111d2a';ctx.fillRect(0,0,W,H);
  const sc=sim.scene,{scale:s,sx,sy}=simulationViewport(sim,zoom,W,H);
  const pixels=document.createElement('canvas');pixels.width=sim.nz;pixels.height=sim.nr;const pc=pixels.getContext('2d'),img=pc.createImageData(sim.nz,sim.nr);
  for(let j=0;j<sim.nr;j++)for(let i=0;i<sim.nz;i++){const k=j*sim.nz+i,p=((sim.nr-j-1)*sim.nz+i)*4;const color=sim.chk[k]?[63,83,105]:sim.mat[k]?[174,191,201]:null;if(color){img.data[p]=color[0];img.data[p+1]=color[1];img.data[p+2]=color[2];img.data[p+3]=255;}}
  pc.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(pixels,sx(sim.zlo),sy(sim.rlo+sim.nr*sim.cs),sim.nz*sim.cs*s,sim.nr*sim.cs*s);
  const poly=(points,color,dash=[])=>{if(!points?.length)return;ctx.strokeStyle=color;ctx.setLineDash(dash);ctx.beginPath();points.forEach(([z,r],i)=>i?ctx.lineTo(sx(z),sy(r)):ctx.moveTo(sx(z),sy(r)));ctx.stroke();ctx.setLineDash([])};
  poly(sc.protect||sc.outline,'#60adff',[4,4]);for(const hole of sc.holes||[])poly(hole,'#60adff',[4,4]);
  if(showPath)sim.segs.forEach(seg=>poly([[seg.z0,seg.x0/2],[seg.z1,seg.x1/2]],seg.type==='r'?'#598076':'#dd9953',seg.type==='r'?[2,3]:[]));
  const state=sim.state(),tip=sim.toolPoly(state.tool,state.x,state.z);if(tip.length){ctx.fillStyle='#fb6b25';ctx.beginPath();tip.forEach(([z,r],i)=>i?ctx.lineTo(sx(z),sy(r)):ctx.moveTo(sx(z),sy(r)));ctx.closePath();ctx.fill();}
  ctx.strokeStyle='#f8c77e';ctx.beginPath();ctx.moveTo(sx(state.z)-7,sy(state.x/2));ctx.lineTo(sx(state.z)+7,sy(state.x/2));ctx.moveTo(sx(state.z),sy(state.x/2)-7);ctx.lineTo(sx(state.z),sy(state.x/2)+7);ctx.stroke();
  ctx.fillStyle='#d2e0ed';ctx.font='14px sans-serif';ctx.fillText('X ↑ (diâmetro) · Z → · meia seção',16,23);ctx.fillText('malha 0,5 mm',W-130,H-12);
}
export default function Simulation({scene,code='',generated=false}) {
  const canvas=useRef(null),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(10),[path,setPath]=useState(false),[zoom,setZoom]=useState(1);
  const data=useMemo(()=>{if(!scene)return null;try{const s=generated?Prog.comDecodificado(Prog.comCompensacao(scene),code,scene.maq):scene;
    const cells=(Math.abs(s.bruto.z1)+Math.abs(s.bruto.z0)+100)*(Math.max(s.bruto.d,s.chuck?.rOut*2||0)+20)*2;if(cells>8000000)throw new Error('Dimensões muito grandes para a malha de simulação. Confira o bruto.');
    const sim=new Sim.Sim(s);return {sim,analysis:sim.analyze()};}catch(error){return {error:error.message}}},[scene,code,generated]);
  useEffect(()=>{setPlaying(false);setTime(0);setZoom(1)},[data]);
  useEffect(()=>{if(data?.sim&&canvas.current){data.sim.seek(time);draw(canvas.current,data.sim,path,zoom)}},[data,time,path,zoom]);
  useEffect(()=>{if(!playing||!data?.sim)return;let handle,previous;function frame(now){if(previous!=null){setTime(t=>{const next=Math.min(data.sim.total,t+(now-previous)/1000*speed);if(next===data.sim.total)setPlaying(false);return next})}previous=now;handle=requestAnimationFrame(frame)}handle=requestAnimationFrame(frame);return()=>cancelAnimationFrame(handle)},[playing,data,speed]);
  if(!data)return <div className="empty">Gere ou carregue um programa para simular.</div>;
  if(data.error)return <Messages errors={[data.error]}/>;
  const {sim,analysis}=data;sim.seek(time);const state=sim.state();
  const step=dir=>{setPlaying(false);const list=sim.groups.map(g=>g.t1);setTime(dir>0?(list.find(t=>t>time+1e-7)??sim.total):(list.filter(t=>t<time-1e-7).at(-1)??0))};
  return <div className="simulation"><div className="toolbar"><button className="primary" onClick={()=>{if(time>=sim.total)setTime(0);setPlaying(!playing)}}>{playing?'Pausar':'Executar'}</button><button onClick={()=>{setTime(0);setPlaying(false)}}>Reiniciar</button><button onClick={()=>step(-1)}>← Bloco</button><button onClick={()=>step(1)}>Bloco →</button><label>Velocidade <select value={speed} onChange={e=>setSpeed(+e.target.value)}>{[1,5,10,25,100].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><label><input type="checkbox" checked={path} onChange={e=>setPath(e.target.checked)}/> Percurso</label><button onClick={()=>setZoom(z=>Math.max(.5,z/1.2))}>−</button><button onClick={()=>setZoom(z=>Math.min(3,z*1.2))}>+</button><button onClick={()=>setZoom(1)}>Ajustar</button></div>
  <canvas ref={canvas} className="sim-canvas" aria-label="Simulação de remoção de material no torno"/>
  <input aria-label="Posição da simulação" type="range" min="0" max={sim.total||1} step="any" value={time} onChange={e=>{setPlaying(false);setTime(+e.target.value)}}/>
  <div className="readout"><span>X {fmt(state.x)}</span><span>Z {fmt(state.z)}</span><span>T {state.tool}</span><span>{fmt(time)} / {fmt(sim.total)} s</span><span>{fmt(state.rpm)} RPM · F {fmt(state.f)}</span></div>
  <div className="decoded"><small>Linha {state.line+1} · {state.label}</small><code>{code.split('\n')[state.line]||''}</code><strong>{state.dec}</strong></div>
  <div className="metrics"><span>Corte <b>{fmt(analysis.tCut)} s</b></span><span>Rápido <b>{fmt(analysis.tRapid)} s</b></span><span>Sobra <b>{fmt(analysis.sobraArea)} mm²</b></span></div>
  <p className="muted">Tempo estimado; não inclui troca de ferramenta e aceleração. {scene.semPerfil?'Programa sem perfil final para comparação. ':''}Haste e porta-ferramenta não são simulados.</p>
  <Card title={'Alertas · '+analysis.alerts.length}>{analysis.alerts.length?analysis.alerts.map((a,i)=>{const item=Diag.deAlerta(a);return <details key={i} className="diagnostic"><summary><button onClick={e=>{e.preventDefault();setPlaying(false);setTime(a.t)}}>Ir ao ponto</button> {a.text}</summary>{item?.causa&&<p>{item.causa}</p>}{item?.solucao?.map((t,j)=><p key={j}>{t}</p>)}</details>}):<p className="muted">Nenhum alerta detectado nas condições configuradas.</p>}</Card></div>;
}
