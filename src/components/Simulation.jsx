import React,{useEffect,useMemo,useRef,useState} from 'react';
import { Sim,Diag } from '../domain.mjs';
import useWorkerJob from '../use-worker-job.mjs';
import { Messages,Card } from './Common.jsx';
import {simulationViewport} from '../simulation-view.mjs';
import {simulationToolParts} from '../assets/tool-drawing.mjs';
const fmt=n=>Number(n||0).toLocaleString('pt-BR',{maximumFractionDigits:2});
function draw(canvas,sim,showPath,zoom,compare,analysis){
  const ctx=canvas.getContext('2d'),W=1000,H=460;canvas.width=W;canvas.height=H;ctx.fillStyle='#111d2a';ctx.fillRect(0,0,W,H);
  const sc=sim.scene,{scale:s,sx,sy}=simulationViewport(sim,zoom,W,H);
  const pixels=document.createElement('canvas');pixels.width=sim.nz;pixels.height=sim.nr;const pc=pixels.getContext('2d'),img=pc.createImageData(sim.nz,sim.nr);
  for(let j=0;j<sim.nr;j++)for(let i=0;i<sim.nz;i++){const k=j*sim.nz+i,p=((sim.nr-j-1)*sim.nz+i)*4;const color=sim.chk[k]?[63,83,105]:sim.mat[k]?[174,191,201]:null;if(color){img.data[p]=color[0];img.data[p+1]=color[1];img.data[p+2]=color[2];img.data[p+3]=255;}}
  pc.putImageData(img,0,0);ctx.imageSmoothingEnabled=false;ctx.drawImage(pixels,sx(sim.zlo),sy(sim.rlo+sim.nr*sim.cs),sim.nz*sim.cs*s,sim.nr*sim.cs*s);
  const poly=(points,color,dash=[])=>{if(!points?.length)return;ctx.strokeStyle=color;ctx.setLineDash(dash);ctx.beginPath();points.forEach(([z,r],i)=>i?ctx.lineTo(sx(z),sy(r)):ctx.moveTo(sx(z),sy(r)));ctx.stroke();ctx.setLineDash([])};
  poly(sc.protect||sc.outline,'#60adff',[4,4]);for(const hole of sc.holes||[])poly(hole,'#60adff',[4,4]);
  if(showPath)sim.segs.forEach(seg=>poly([[seg.z0,seg.x0/2],[seg.z1,seg.x1/2]],seg.type==='r'?'#598076':'#dd9953',seg.type==='r'?[2,3]:[]));
  if(compare&&sc.programmedPath){let previous=[sc.start.z,sc.start.x/2];for(const move of sc.programmedPath){const next=[move.z,move.x/2];if(move.comp)poly([previous,next],'#a0cfff',[5,4]);previous=next;}}
  const state=sim.state(),tip=sim.toolPoly(state.tool,state.x,state.z),tool=sc.tools[state.tool];
  const fill=(points,color)=>{ctx.fillStyle=color;ctx.beginPath();points.forEach(([z,r],i)=>i?ctx.lineTo(sx(z),sy(r)):ctx.moveTo(sx(z),sy(r)));ctx.closePath();ctx.fill();};
  if(tip.length&&tool){const parts=simulationToolParts(tool),world=p=>[state.z+p[0],state.x/2+p[1]];fill(parts.hold.map(world),'rgba(132,153,177,.4)');poly(parts.hold.map(world),'#8296ab');fill(tip,'#fb6b25');poly(tip,'#ffe1cc');const nose=sim.shapes[state.tool]?.nose;if(nose){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(sx(state.z+nose[0]),sy(state.x/2+nose[1]),2,0,Math.PI*2);ctx.fill();}}
  const contact=analysis?.alerts.find(a=>a.contact&&(a.seg===state.seg||Math.abs(a.t-sim.t)<1e-6));
  if(contact){ctx.strokeStyle='#ff384c';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sx(contact.contact.z),sy(contact.contact.x/2),9,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;ctx.fillStyle='#ff8290';ctx.font='bold 14px sans-serif';ctx.fillText('CONTATO · '+contact.type,Math.max(8,Math.min(W-220,sx(contact.contact.z)+12)),Math.max(42,Math.min(H-20,sy(contact.contact.x/2)-12)));}
  ctx.strokeStyle='#f8c77e';ctx.beginPath();ctx.moveTo(sx(state.z)-7,sy(state.x/2));ctx.lineTo(sx(state.z)+7,sy(state.x/2));ctx.moveTo(sx(state.z),sy(state.x/2)-7);ctx.lineTo(sx(state.z),sy(state.x/2)+7);ctx.stroke();
  const visible=tip.length&&Math.max(...tip.map(p=>sx(p[0])))>=0&&Math.min(...tip.map(p=>sx(p[0])))<=W&&Math.max(...tip.map(p=>sy(p[1])))>=0&&Math.min(...tip.map(p=>sy(p[1])))<=H;
  ctx.fillStyle='#d2e0ed';ctx.font='14px sans-serif';ctx.fillText('X ↑ (diâmetro) · Z → · meia seção',16,23);ctx.fillText('T'+state.tool+(visible?'':' · fora da área visível'),W-230,23);ctx.fillText('malha 0,5 mm',W-130,H-12);
}
export default function Simulation({scene,code='',generated=false}) {
  const canvas=useRef(null),[time,setTime]=useState(0),[playing,setPlaying]=useState(false),[speed,setSpeed]=useState(10),[path,setPath]=useState(false),[zoom,setZoom]=useState(1),[compare,setCompare]=useState(false);
  const input=useMemo(()=>scene?{scene,code,generated}:null,[scene,code,generated]);
  const job=useWorkerJob('simulation',input,0),meta=job.meta;
  const sim=useMemo(()=>meta&&job.frame?Object.assign(Object.create(Sim.Sim.prototype),meta,{mat:job.frame.mat,t:job.frame.time,state:()=>job.frame.state}):null,[meta,job.frame]);
  useEffect(()=>{setPlaying(false);setTime(0);setZoom(1)},[input]);
  useEffect(()=>{if(meta)job.seek(time)},[meta,time,job.seek]);
  useEffect(()=>{if(sim&&canvas.current)draw(canvas.current,sim,path,zoom,compare,job.analysis)},[sim,path,zoom,compare,job.analysis]);
  useEffect(()=>{if(!playing||!meta)return;let handle,previous;function frame(now){if(previous!=null){setTime(t=>{const next=Math.min(meta.total,t+(now-previous)/1000*speed);if(next===meta.total)setPlaying(false);return next})}previous=now;handle=requestAnimationFrame(frame)}handle=requestAnimationFrame(frame);return()=>cancelAnimationFrame(handle)},[playing,meta,speed]);
  if(!scene)return <div className="empty">Gere ou carregue um programa para simular.</div>;
  if(job.error)return <Messages errors={[job.error]}/>;
  if(job.busy||!sim)return <p className="note" role="status">{job.status||'Preparando simulação…'} A tela continua disponível.</p>;
  const analysis=job.analysis,state=sim.state(),contacts=analysis.alerts.filter(a=>['haste','inserto','incremento','placa','rapido','peca'].includes(a.type));
  const step=dir=>{setPlaying(false);const list=sim.groups.map(g=>g.t1);setTime(dir>0?(list.find(t=>t>time+1e-7)??sim.total):(list.filter(t=>t<time-1e-7).at(-1)??0))};
  return <div className="simulation"><div className="toolbar"><button className="primary" onClick={()=>{if(time>=sim.total)setTime(0);setPlaying(!playing)}}>{playing?'Pausar':'Executar'}</button><button onClick={()=>{setTime(0);setPlaying(false)}}>Reiniciar</button><button onClick={()=>step(-1)}>← Bloco</button><button onClick={()=>step(1)}>Bloco →</button><label>Velocidade <select aria-label="Velocidade" value={speed} onChange={e=>setSpeed(+e.target.value)}>{[1,5,10,25,100,400].map(n=><option key={n} value={n}>{n}×</option>)}</select></label><label><input type="checkbox" checked={path} onChange={e=>setPath(e.target.checked)}/> Percurso</label><button onClick={()=>setZoom(z=>Math.max(.5,z/1.2))}>−</button><button onClick={()=>setZoom(z=>Math.min(3,z*1.2))}>+</button><button onClick={()=>setZoom(1)}>Ajustar</button></div>
  {sim.scene.programmedPath?.some(m=>m.comp)&&<label className="checkbox"><input type="checkbox" checked={compare} onChange={e=>{setCompare(e.target.checked);if(e.target.checked)setPath(true)}}/> Comparar trajetória programada (azul tracejado) e compensada (laranja)</label>}
  {contacts.length>0&&<div className="message error" role="alert" data-contact-count={contacts.length}><b>{contacts.length} alerta(s) de contato / engajamento no percurso.</b> <button onClick={()=>{setPlaying(false);setTime(contacts[0].t)}}>Ir ao primeiro contato</button><p>A remoção exibida não indica que o corte seja permitido. Confira os alertas e a região marcada em vermelho.</p></div>}
  {analysis.unverifiedDepth?.length>0&&<p className="message warning">Incremento não verificado em {analysis.unverifiedDepth.map(p=>'T'+p.tool+' ('+(p.axis==='r'?'raio':'Z')+')').join(', ')}: falta limite de profundidade conhecido no banco ou no ciclo. A geometria e a haste continuam sendo analisadas.</p>}
  <canvas ref={canvas} className="sim-canvas" aria-label="Simulação de remoção de material no torno"/>
  <input aria-label="Posição da simulação" type="range" min="0" max={sim.total||1} step="any" value={time} onChange={e=>{setPlaying(false);setTime(+e.target.value)}}/>
  <div className="readout"><span>X {fmt(state.x)}</span><span>Z {fmt(state.z)}</span><span>T {state.tool}</span><span>{fmt(job.frame.time/60)} / {fmt(sim.total/60)} min</span><span>{fmt(state.rpm)} RPM · F {fmt(state.f)}</span></div>
  <div className="decoded"><small>Linha {state.line+1} · {state.label}{state.pass?' · Passe '+state.pass+' / '+state.passes:''}</small><code>{code.split('\n')[state.line]||''}</code><strong>{state.dec}</strong></div>
  <div className="metrics"><span>Corte <b>{fmt(analysis.tCut/60)} min</b></span><span>Rápido <b>{fmt(analysis.tRapid/60)} min</b></span><span>Sobra <b>{fmt(analysis.sobraArea)} mm²</b></span></div>
  <p className="muted">Laranja: inserto. Cinza: haste / suporte. Vermelho: região de contato detectada. Cruz: referência programada; ponto branco: centro do raio. A análise usa os incrementos do banco e os limites conhecidos do ciclo (torneamento no raio, faceamento em Z), prevalecendo o menor. No canal / corte, toda a aresta frontal pode cortar.</p>
  <p className="muted">Modelo 2D no plano XZ, malha de 0,5 mm: use as dimensões reais da montagem. Contatos menores que a resolução podem não ser detectados; geometrias fora desse plano não são representadas.</p>
  <p className="muted">Tempo estimado; não inclui troca de ferramenta e aceleração. {scene.semPerfil?'Programa sem perfil final para comparação. ':''}</p>
  <Card title={'Alertas · '+analysis.alerts.length}>{analysis.alerts.length?analysis.alerts.map((a,i)=>{const item=Diag.deAlerta(a);return <details key={i} className="diagnostic"><summary><button onClick={e=>{e.preventDefault();setPlaying(false);setTime(a.t)}}>Ir ao ponto</button> {a.text}</summary>{item?.causa&&<p>{item.causa}</p>}{item?.solucao?.map((t,j)=><p key={j}>{t}</p>)}</details>}):<p className="muted">Nenhum alerta detectado nas condições configuradas.</p>}</Card></div>;
}
