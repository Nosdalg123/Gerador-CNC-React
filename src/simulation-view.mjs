// Janela fixa da peça inteira; retornos ao ponto de troca não mudam a escala.
export function simulationViewport(sim,zoom=1,width=1000,height=460){
  const scene=sim.scene,b=scene.bruto,points=[];
  const add=(z,r)=>{if(Number.isFinite(z)&&Number.isFinite(r))points.push([z,r]);};
  add(b.z0,0);add(b.z1,0);add(b.z0,b.d/2);add(b.z1,b.d/2);
  for(const s of b.perfil||[]){add(s.z0,s.d/2);add(s.z1,(s.d1??s.d)/2);}
  for(const poly of [scene.outline,scene.protect,...(scene.holes||[]),...(scene.interiores||[]),...(b.vazios||[])])for(const p of poly||[])add(p[0],p[1]);
  if(!points.length){add(sim.zlo,0);add(sim.zhi,Math.max(10,sim.rhi));}
  let z0=Math.min(...points.map(p=>p[0]))-8,z1=Math.max(...points.map(p=>p[0]))+8;
  let r0=Math.min(0,...points.map(p=>p[1]))-8,r1=Math.max(10,...points.map(p=>p[1]))+8;
  // Reserva espaço para a pastilha interna junto ao eixo, sem seguir a ferramenta.
  for(const shape of Object.values(sim.shapes||{}))r0=Math.min(r0,shape.bb[2]-2);
  const focus=scene.foco;
  if(focus){if(Number.isFinite(focus.z0))z0=Math.min(z0,focus.z0);if(Number.isFinite(focus.z1))z1=Math.max(z1,focus.z1);if(Number.isFinite(focus.r0))r0=Math.min(r0,focus.r0);if(Number.isFinite(focus.r1))r1=Math.max(r1,focus.r1);}
  const scale=Math.min((width-70)/(z1-z0),(height-60)/(r1-r0))*(Number.isFinite(zoom)&&zoom>0?zoom:1);
  const cz=(z0+z1)/2,cr=(r0+r1)/2;
  return {z0,z1,r0,r1,scale,sx:z=>width/2+(z-cz)*scale,sy:r=>height/2-(r-cr)*scale};
}
