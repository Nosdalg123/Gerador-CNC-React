import '../../public/engine/sim.js';
// Croquis do banco e montagem física usada na animação.
  function rect(z0, r0, z1, r1) { return [[z0, r0], [z1, r0], [z1, r1], [z0, r1]]; }
  function espelhaR(pts) { return pts.map(function (p) { return [p[0], -p[1]]; }); }
  function pecasFerr(f) {
    var k = f.kind, w = Number(f.largura) || 4.5, DEG = Math.PI / 180, ins, hold, furo = null, i;
    if (k === 'canal') { ins = rect(0, 0, 9, w); hold = rect(6, -4, 58, w + 4); }
    else if (k === 'canalext') { ins = rect(-w, 0, 0, 9); hold = rect(-w - 4, 7, 4, 46); }
    else if (k === 'canalint') { ins = rect(-w, -9, 0, 0); hold = rect(-w - 2, -22, 56, -7); }
    else if (k === 'rosca' || k === 'roscaint') {
      var hr = 8, ar = hr * Math.tan(30 * DEG);
      ins = [[0, 0], [ar, hr], [-ar, hr]]; hold = rect(-14, hr - 1.5, 42, hr + 13);
      if (k === 'roscaint') {
        ins = espelhaR(ins);
        // Cabeça estreita junto ao inserto, pescoço e haste longa à direita.
        // Coordenadas físicas mantidas: ponta (0,0), barra no interior (-r).
        hold = [[-3,-3],[-3,-9],[0,-13],[5,-16],[17,-16],[22,-14],[26,-14],[29,-20],[90,-20],[90,-4],[29,-4],[26,-7],[17,-7],[10,-6],[5,-3]];
        furo = [0,-5.3,1.3];
      }
    } else if (k === 'broca') {
      var rd = w / 2; // w = Ø da broca
      ins = rect(0, 0, 40, rd); hold = rect(38, 0, 78, rd * 0.85);
    } else { // pastilha rombica (externa) ou barra de mandrilar (interna): inserto de aresta igual, ponta com raio
      var a = (Number(f.ang) || 80) * DEG, rn = Math.max(0, Number(f.raio) || 0), Li = 9, u2 = [Math.cos(a), Math.sin(a)], pts = [], n = 8;
      if (rn > 0.001) {
        var d = rn / Math.sin(a / 2), bx = 1 + u2[0], by = u2[1], bl = Math.hypot(bx, by), C = [d * bx / bl, d * by / bl], th2 = 90 * DEG + a, th1 = 270 * DEG;
        for (i = 0; i <= n; i++) { var th = th2 + (th1 - th2) * i / n; pts.push([C[0] + rn * Math.cos(th), C[1] + rn * Math.sin(th)]); }
      } else pts.push([0, 0]);
      pts.push([Li, 0], [Li + Li * u2[0], Li * u2[1]], [Li * u2[0], Li * u2[1]]);
      var zm = 1e9, rm = 1e9;
      pts.forEach(function (p) { zm = Math.min(zm, p[0]); rm = Math.min(rm, p[1]); });
      ins = pts.map(function (p) { return [p[0] - zm, p[1] - rm]; });
      var hmax = Li * u2[1], r0 = hmax * 0.55;
      hold = k === 'interna' ? rect(Li * 0.6, r0 - 4, Li * 0.6 + 70, r0 + 8) : rect(Li * 0.5, r0, Li * 0.5 + 55, r0 + 16);
      furo = [Li * (1 + u2[0]) / 2 - zm, hmax / 2 - rm, 1.7];
      var kap = Number(f.ap) || 0, phi = kap > 0 ? Math.max(0, Math.min(60, 180 - kap - (Number(f.ang) || 80))) * DEG : 0;
      if (phi > 0) { // suporte: gira o inserto, o corpo e o furo em volta da ponta e leva a origem para o canto do inserto girado
        var cs = Math.cos(phi), sn = Math.sin(phi), rot = function (p) { return [p[0] * cs - p[1] * sn, p[0] * sn + p[1] * cs]; };
        ins = ins.map(rot); hold = hold.map(rot);
        var fc = rot([furo[0], furo[1]]), z2 = Math.min.apply(null, ins.map(function (p) { return p[0]; })), r2 = Math.min.apply(null, ins.map(function (p) { return p[1]; }));
        var sh = function (p) { return [p[0] - z2, p[1] - r2]; };
        ins = ins.map(sh); hold = hold.map(sh); furo = [fc[0] - z2, fc[1] - r2, furo[2]];
      }
      if (k === 'interna') { ins = espelhaR(ins); hold = espelhaR(hold); furo[1] = -furo[1]; }
    }
    return { ins: ins, hold: hold, furo: furo };
  }
  function vistaFerr(f) {
    var pc = pecasFerr(f);
    if (f.kind === 'rosca') {
      // Croqui do suporte radial: haste vertical e inserto assentado no canto
      // inferior esquerdo. A rotação pertence só à vista, nunca ao corte.
      var cs = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
      pc.ins = pc.ins.map(function (p) { return [p[0] * cs + p[1] * sn, -p[0] * sn + p[1] * cs]; });
      pc.hold = [[0,0],[7,0],[18,11],[18,76],[3,76],[3,18],[0,16]];
      pc.furo = [8 / 3, 8 * cs * 2 / 3, 1.3];
      pc.ombro = [[3,18],[18,18]];
    }
    // Vista do suporte interno pela face inferior, como o croqui de referência.
    // Apenas a apresentação é espelhada; não altera a geometria de corte no motor.
    if (f.kind === 'roscaint') { pc.ins=espelhaR(pc.ins);pc.hold=espelhaR(pc.hold);if(pc.furo)pc.furo=[pc.furo[0],-pc.furo[1],pc.furo[2]]; }
    return pc;
  }
  function simulationToolParts(f) {
    if(globalThis.CNCSim.configurableTool(f))return configuredParts(f);
    const pc=pecasFerr(f),shape=globalThis.CNCSim.toolShape(f),natural=globalThis.CNCSim.toolShape({...f,tip:undefined});
    const delta=shape.nose&&natural.nose?shape.nose.map((n,i)=>n-natural.nose[i]):[0,0],shift=p=>[p[0]+delta[0],p[1]+delta[1]];
    return {...pc,ins:shape.pts,hold:pc.hold.map(shift),furo:pc.furo?[...shift(pc.furo),pc.furo[2]]:null};
  }
  function hull(points){const sorted=points.toSorted((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p)}return out};return half(sorted).slice(0,-1).concat(half(sorted.toReversed()).slice(0,-1));}
  function configuredParts(f){
    const Sim=globalThis.CNCSim,canonical={...f,mount:'auto',tip:undefined},base=Sim.toolShape(canonical),actual=Sim.toolShape(f),mount=Sim.mounting(f),internal=['interna','canalint','roscaint'].includes(f.kind),radial=['canalext','rosca'].includes(f.kind),thickness=Number(f.shankThickness)>0?Number(f.shankThickness):f.kind==='broca'?(f.largura||10)*.85:internal?12:16;
    const [zmin,zmax,rmin,rmax]=base.bb,cz=(zmin+zmax)/2,cr=(rmin+rmax)/2;let shaft,hold;
    if(f.kind==='broca'){shaft=rect(38,0,78,thickness/2);hold=shaft;}
    else{
      const kap=Number(f.ap),theta=Number.isFinite(kap)&&kap>0&&!['rombo','interna'].includes(f.kind)?(90-kap)*Math.PI/180:0,axis=radial?[Math.sin(theta),Math.cos(theta)]:[Math.cos(theta),(internal?-1:1)*Math.sin(theta)],normal=[-axis[1],axis[0]],origin=radial?[f.kind==='rosca'?(zmax-zmin)/2+thickness/4:cz,Math.max(2,rmax*.55)]:[Math.max(3,zmax*.65),f.kind==='canal'?cr:(internal?-1:1)*(thickness/2+1)],length=internal?70:55;
      const point=(distance,side)=>[origin[0]+axis[0]*distance+normal[0]*side,origin[1]+axis[1]*distance+normal[1]*side];shaft=[point(0,-thickness/2),point(length,-thickness/2),point(length,thickness/2),point(0,thickness/2)];
      const maxDistance=Math.max(...base.pts.map(p=>Math.hypot(...p))),seat=base.pts.filter(p=>Math.hypot(...p)>maxDistance*.4),pad=Math.max(.01,Math.min(zmax-zmin,rmax-rmin)/10);hold=hull(seat.concat(shaft,rect(cz-pad,cr-pad,cz+pad,cr+pad)));
    }
    const baseNose=base.nose?[base.nose[0]*mount.z,base.nose[1]*mount.r]:[0,0],delta=actual.nose?actual.nose.map((n,i)=>n-baseNose[i]):[0,0],pose=p=>[p[0]*mount.z+delta[0],p[1]*mount.r+delta[1]],furo=f.kind==='broca'?null:[...pose([cz,cr]),Math.min(1.7,(zmax-zmin)/8,(rmax-rmin)/8)];
    return {ins:actual.pts,hold:hold.map(pose),furo,shaft:shaft.map(pose),thickness};
  }
  function svgFerr(f,{physical=false}={}) {
    physical=physical||globalThis.CNCSim.configurableTool(f);
    var pc = physical?simulationToolParts(f):vistaFerr(f);
    var all = pc.ins.concat(pc.hold, [[0, 0]]), zmin = 1e9, zmax = -1e9, rmin = 1e9, rmax = -1e9;
    all.forEach(function (p) { zmin = Math.min(zmin, p[0]); zmax = Math.max(zmax, p[0]); rmin = Math.min(rmin, p[1]); rmax = Math.max(rmax, p[1]); });
    var W = 260, H = f.kind === 'rosca' ? 190 : 150, mx = 14, mt = 20, mb = 24, bw = Math.max(zmax - zmin, 1), bh = Math.max(rmax - rmin, 1);
    var sc = Math.min((W - 2 * mx) / bw, (H - mt - mb) / bh, 9), px = (W - bw * sc) / 2, py = mt + (H - mt - mb - bh * sc) / 2;
    function X(z) { return px + (z - zmin) * sc; }
    function Y(r) { return H - mb - (H - mt - mb - bh * sc) / 2 - (r - rmin) * sc; }
    function poly(pts, cls) { return '<polygon class="' + cls + '" points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>'; }
    var mountLabel=['inferior_esquerdo','inferior_direito','superior_esquerdo','superior_direito'].includes(f.mount)?f.mount:'auto';
    var tx = X(0), ty = Y(0), o = '<svg class="ps-svg" data-mount="'+mountLabel+'" data-shank-thickness="'+(Number(pc.thickness)||'')+'" data-insert-width="'+(Number(f.insertWidth)||'')+'" data-kappa="'+(Number(f.ap)||'')+'" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Inserto e suporte da ferramenta' + (physical?', montagem no plano XZ da simulação':f.kind === 'roscaint' ? ', vista inferior da barra de rosca interna' : f.kind === 'rosca' ? ', suporte vertical de rosca externa' : '') + '">';
    if (f.kind === 'broca') o += '<line class="eixo" x1="2" x2="' + (W - 2) + '" y1="' + ty.toFixed(1) + '" y2="' + ty.toFixed(1) + '"/><text class="m" x="' + (W - 4) + '" y="' + (ty - 4).toFixed(1) + '" text-anchor="end">eixo da peça</text>';
    o += poly(pc.hold, 'h') + poly(pc.ins, 'f');
    if (pc.ombro) o += '<path class="ombro" d="M' + X(pc.ombro[0][0]).toFixed(1) + ' ' + Y(pc.ombro[0][1]).toFixed(1) + 'L' + X(pc.ombro[1][0]).toFixed(1) + ' ' + Y(pc.ombro[1][1]).toFixed(1) + '"/>';
    if (pc.furo) o += '<circle class="furo" cx="' + X(pc.furo[0]).toFixed(1) + '" cy="' + Y(pc.furo[1]).toFixed(1) + '" r="' + (pc.furo[2] * sc).toFixed(1) + '"/>';
    o += '<path class="tip" d="M' + (tx - 6).toFixed(1) + ' ' + ty.toFixed(1) + 'H' + (tx + 6).toFixed(1) + 'M' + tx.toFixed(1) + ' ' + (ty - 6).toFixed(1) + 'V' + (ty + 6).toFixed(1) + '"/>';
    o += '<text class="m" x="4" y="12">← peça / placa</text><text class="m" x="' + (W - 4) + '" y="12" text-anchor="end">' + (!physical&&f.kind === 'roscaint' ? 'vista inferior · +Z →' : '+Z →   ↑ +X') + '</text>';
    o += '<rect class="f" x="6" y="' + (H - 15) + '" width="10" height="8"/><text x="20" y="' + (H - 8) + '">' + (f.kind === 'broca' ? 'corpo da broca' : 'inserto') + '</text>';
    o += '<rect class="h" x="' + (f.kind === 'broca' ? 100 : 76) + '" y="' + (H - 15) + '" width="10" height="8"/><text x="' + (f.kind === 'broca' ? 114 : 90) + '" y="' + (H - 8) + '">' + (f.kind === 'broca' ? 'haste' : 'suporte (haste)') + '</text>';
    o += '<path class="tip" d="M' + (W - 70) + ' ' + (H - 11) + 'h8M' + (W - 66) + ' ' + (H - 15) + 'v8"/><text x="' + (W - 58) + '" y="' + (H - 8) + '">ponta</text>';
    return o + '</svg>';
  }


export {svgFerr,pecasFerr,vistaFerr,simulationToolParts};
