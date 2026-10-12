const test=require('node:test'),assert=require('node:assert/strict');
test('rosca interna ancora inserto na cabeça e mostra haste à direita sem alterar corte',async()=>{
 const {pecasFerr,svgFerr}=await import('../src/assets/tool-drawing.mjs'),Sim=require('../public/engine/sim.js');
 const shape={kind:'roscaint'},pc=pecasFerr(shape),before=Sim.toolShape(shape);
 assert.deepEqual(pc.ins.map(([z,r])=>[z,r||0]).sort((a,b)=>a[0]-b[0]),before.pts.toSorted((a,b)=>a[0]-b[0]));
 assert.ok(Math.max(...pc.hold.map(p=>p[0]))>80);assert.ok(Math.min(...pc.hold.map(p=>p[0]))>Math.min(...pc.ins.map(p=>p[0])));
 assert.ok(pc.furo&&pc.hold.length>4);const svg=svgFerr(shape);assert.match(svg,/vista inferior/);assert.match(svg,/class="furo"/);
 assert.deepEqual(Sim.toolShape(shape),before);
});
test('rosca externa mostra haste vertical e inserto assentado sem mudar o polígono de corte',async()=>{
 const {pecasFerr,vistaFerr,svgFerr}=await import('../src/assets/tool-drawing.mjs'),Sim=require('../public/engine/sim.js');
 const shape={kind:'rosca'},physical=Sim.toolShape(shape),view=vistaFerr(shape);
 assert.deepEqual(pecasFerr(shape).ins.toSorted((a,b)=>a[0]-b[0]),physical.pts.toSorted((a,b)=>a[0]-b[0]));
 const zs=view.hold.map(p=>p[0]),rs=view.hold.map(p=>p[1]);
 assert.ok(Math.max(...rs)-Math.min(...rs)>3*(Math.max(...zs)-Math.min(...zs)),'Haste deve subir sobre a cabeça');
 function contains([x,y]){
  let inside=false;
  for(let i=0,j=view.hold.length-1;i<view.hold.length;j=i++){
   const [ax,ay]=view.hold[j],[bx,by]=view.hold[i],cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
   if(Math.abs(cross)<1e-8&&x>=Math.min(ax,bx)-1e-8&&x<=Math.max(ax,bx)+1e-8&&y>=Math.min(ay,by)-1e-8&&y<=Math.max(ay,by)+1e-8)return true;
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 }
 assert.ok(view.ins.every(contains),'Inserto precisa estar assentado na cabeça, sem ficar solto');
 assert.ok(contains(view.furo));assert.deepEqual(view.ins[0],[0,0]);assert.ok(view.ombro);
 const svg=svgFerr(shape);assert.match(svg,/suporte vertical de rosca externa/);assert.match(svg,/class="furo"/);
 assert.deepEqual(Sim.toolShape(shape),physical);
});
