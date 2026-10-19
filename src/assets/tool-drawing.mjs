import '../../public/engine/sim.js';
// Croquis do banco e montagem física usada na animação.
  const {pecasFerr,simulationToolParts}=globalThis.CNCSim;
  const espelhaR=pts=>pts.map(p=>[p[0],-p[1]]);
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
  function svgFerr(f,{physical=false}={}) {
    physical=physical||globalThis.CNCSim.configurableTool(f);
    var pc = physical?simulationToolParts(f):vistaFerr(f);
    var all = pc.ins.concat(pc.hold, [[0, 0]]), zmin = 1e9, zmax = -1e9, rmin = 1e9, rmax = -1e9;
    all.forEach(function (p) { zmin = Math.min(zmin, p[0]); zmax = Math.max(zmax, p[0]); rmin = Math.min(rmin, p[1]); rmax = Math.max(rmax, p[1]); });
    var vertical=(rmax-rmin)>(zmax-zmin)*1.25,W = 300, H = vertical ? 360 : 220, mx = 14, mt = 20, mb = 24, bw = Math.max(zmax - zmin, 1), bh = Math.max(rmax - rmin, 1);
    var sc = Math.min((W - 2 * mx) / bw, (H - mt - mb) / bh, 9), px = (W - bw * sc) / 2, py = mt + (H - mt - mb - bh * sc) / 2;
    function X(z) { return px + (z - zmin) * sc; }
    function Y(r) { return H - mb - (H - mt - mb - bh * sc) / 2 - (r - rmin) * sc; }
    function poly(pts, cls) { return '<polygon class="' + cls + '" points="' + pts.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '"/>'; }
    var mountLabel=['inferior_esquerdo','inferior_direito','superior_esquerdo','superior_direito'].includes(f.mount)?f.mount:'auto';
    var tx = X(0), ty = Y(0), o = '<svg class="ps-svg" data-insert-shape="'+(String(f.insertShape||'auto').replace(/[^a-zA-Z0-9]/g,''))+'" data-vertical="'+vertical+'" data-mount="'+mountLabel+'" data-insert-seat="'+(['centro','esquerda','direita'].includes(f.insertSeat)?f.insertSeat:'auto')+'" data-holder-orientation="'+(['horizontal','vertical'].includes(f.holderOrientation)?f.holderOrientation:'auto')+'" data-shank-thickness="'+(Number(pc.thickness)||'')+'" data-insert-width="'+(Number(f.insertWidth)||'')+'" data-kappa="'+(Number(f.ap)||'')+'" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Inserto e suporte da ferramenta' + (physical?', montagem no plano XZ da simulação':f.kind === 'roscaint' ? ', vista inferior da barra de rosca interna' : f.kind === 'rosca' ? ', suporte vertical de rosca externa' : '') + '">';
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
