/* Motor de simulacao 2D (corte XZ, meia secao) - sem dependencia de DOM.
   Coordenadas do percurso: X = diametro, Z = eixo. Internamente: (z, r) com r = X/2 em mm.
   Material = grade de celulas; a pastilha remove celulas durante os movimentos de corte. */
(function (root, factory) {
  var api=factory();root.CNCSim=api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis, function () {
  var DEG = Math.PI / 180;
  var MARGEM = 0.03; // mm: tolerancia p/ encostar sem contar como colisao
  function mounting(tool){
    var internal=['interna','canalint','roscaint'].includes(tool.kind),nativeR=internal?-1:1;
    var positions={inferior_esquerdo:[1,1,3],inferior_direito:[-1,1,4],superior_esquerdo:[1,-1,2],superior_direito:[-1,-1,1]},position=tool.kind!=='broca'&&Object.hasOwn(positions,tool.mount)?positions[tool.mount]:null;
    return {z:position?position[0]:1,r:position?position[1]/nativeR:1,tip:position?position[2]:(internal?2:3)};
  }
  function configurableCut(tool){return !!tool.insertShape||tool.mount!=null||Number(tool.raioPerfil)>0||['insertWidth','insertLength','shankThickness'].some(k=>Number(tool[k])>0);}
  function configurableTool(tool){return configurableCut(tool)||tool.insertSeat!=null||tool.holderOrientation!=null;}
  function positive(value,fallback){return Number(value)>0?Number(value):fallback;}

  // Aresta frontal arredondada; a referência continua no canto teórico, sem deslocar o percurso.
  function grooveProfile(width,length,radius,kind){
    if(!Number.isFinite(radius)||radius<0||radius>width/2||radius>length)throw Error('Raio do perfil de corte incompatível com a largura ou comprimento do inserto.');
    var pts=[],add=function(u,v){var p=[u,v],last=pts[pts.length-1];if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>1e-9)pts.push(p);};
    if(radius===0)pts=[[0,0],[width,0],[width,length],[0,length]];
    else{
      add(radius,0);add(width-radius,0);
      for(var i=1;i<=16;i++){var a=-Math.PI/2+i*Math.PI/32;add(width-radius+radius*Math.cos(a),radius+radius*Math.sin(a));}
      add(width,length);add(0,length);add(0,radius);
      for(var j=1;j<16;j++){var b=Math.PI+j*Math.PI/32;add(radius+radius*Math.cos(b),radius+radius*Math.sin(b));}
    }
    if(kind==='canal')return pts.map(p=>[p[1],p[0]]).reverse();
    if(kind==='canalint')return pts.map(p=>[p[0]-width,-p[1]]).reverse();
    return pts.map(p=>[p[0]-width,p[1]]);
  }

  /* ---------- geometria da ferramenta (poligono convexo, anti-horario) ---------- */
  // Ponto de referencia (0,0) = ponta programada. Eixos: [z, r].
  function toolShape(tool) {
    var pts = [], i, nose = null; // nose = centro do raio de ponta em relacao a ponta de referencia [z, r] (para G41/G42)
    if (tool.kind === 'canal') {
      var w = Math.max(configurableCut(tool) ? 0.01 : 0.5, Number(tool.largura) || 4.5), L = positive(tool.insertLength,12);
      // canto interno (lado do centro) = ponto programado; largura cresce para fora (+r)
      pts = Number(tool.raioPerfil)>0?grooveProfile(w,L,Number(tool.raioPerfil),'canal'):[[0, 0], [L, 0], [L, w], [0, w]];
    } else if (tool.kind === 'canalext') {
      // canal externo (radial): largura em Z, corpo para fora (+r); ponto programado = canto da ponta do lado da face (+z)
      var we = Math.max(configurableCut(tool) ? 0.01 : 0.5, Number(tool.largura) || 4.5), Le = positive(tool.insertLength,14);
      pts = Number(tool.raioPerfil)>0?grooveProfile(we,Le,Number(tool.raioPerfil),'canalext'):[[-we, 0], [0, 0], [0, Le], [-we, Le]];
    } else if (tool.kind === 'canalint') {
      // canal interno (radial): a barra fica dentro do furo (lado do eixo, -r) e a pastilha corta para fora (+r); ponto programado = canto da ponta do lado da face (+z)
      var wi = Math.max(configurableCut(tool) ? 0.01 : 0.5, Number(tool.largura) || 4.5), Li = positive(tool.insertLength,8);
      pts = Number(tool.raioPerfil)>0?grooveProfile(wi,Li,Number(tool.raioPerfil),'canalint'):[[-wi, 0], [-wi, -Li], [0, -Li], [0, 0]];
    } else if (tool.kind === 'rosca' || tool.kind === 'roscaint') {
      // ferramenta de rosca 60 graus: ponta em V; externa fica fora (+r) com a ponta para o eixo, interna dentro (-r) com a ponta para fora
      var threadAngle=positive(tool.ang,60)/2*DEG,hr=Number(tool.insertWidth)>0?Number(tool.insertWidth)/(2*Math.tan(threadAngle)):8,ar=hr*Math.tan(threadAngle);
      pts = tool.kind === 'rosca' ? [[0, 0], [ar, hr], [-ar, hr]] : [[0, 0], [-ar, -hr], [ar, -hr]];
    } else if (tool.kind === 'broca') {
      // broca (furacao no eixo): ponta programada = centro da ponta; o corpo cobre de r = 0 ate o raio da broca e recua em +z
      var rd = configurableCut(tool)?positive(tool.largura,10)/2:Math.max(0.5,(Number(tool.largura)||10)/2), Ld = 40;
      pts = [[0, 0], [Ld, 0], [Ld, rd], [0, rd]];
    } else {
      var a = (Number(tool.ang) || 80) * DEG, rn = Math.max(0, Number(tool.raio) || 0), Lb = Number(tool.insertWidth)>0?Number(tool.insertWidth)/Math.sin(a):12,configured=configurableCut(tool);
      // suporte (angulo de posicao kappa): o inserto gira phi = 180 - kappa - ponta; a aresta de tras sobe para +Z
      // e deixa de cortar alem de um perfil que desce em direcao a placa. Sem kappa: aresta de tras reta (phi = 0)
      var kap = Number(tool.ap) || 0, phi = kap > 0 ? (configured?180-kap-(Number(tool.ang)||80):Math.max(0,Math.min(60,180-kap-(Number(tool.ang)||80)))) * DEG : 0;
      var u1 = [Math.cos(phi), Math.sin(phi)], u2 = [Math.cos(a + phi), Math.sin(a + phi)], C = null;
      var E1 = [Lb * u1[0], Lb * u1[1]], E2 = [Lb * u2[0], Lb * u2[1]];
      var far = [E1[0] + E2[0], E1[1] + E2[1]];
      if (rn > 0.001) {
        var half = a / 2, d = rn / Math.sin(half);
        var bx = u1[0] + u2[0], by = u1[1] + u2[1], bl = Math.hypot(bx, by);
        C = [d * bx / bl, d * by / bl];
        var th2 = 90 * DEG + a + phi, th1 = 270 * DEG + phi, n = 8;
        for (i = 0; i <= n; i++) {
          var th = th2 + (th1 - th2) * i / n;
          pts.push([C[0] + rn * Math.cos(th), C[1] + rn * Math.sin(th)]);
        }
      } else {pts.push([0, 0]);if(configured)C=[0,0];}
      if(tool.insertShape==='R'){
        var radius=positive(tool.insertWidth,12)/2;pts=[];C=[radius,radius];
        for(i=0;i<64;i++){var alpha=-Math.PI/2+i*Math.PI/32;pts.push([radius+radius*Math.cos(alpha),radius+radius*Math.sin(alpha)]);}
      }else if(tool.insertShape==='T'){
        // Triângulo equilátero: IC = lado / sqrt(3).
        var side=positive(tool.insertWidth,12)*Math.sqrt(3);E1=[side*u1[0],side*u1[1]];E2=[side*u2[0],side*u2[1]];pts.push(E1,E2);
      }else if(tool.insertShape==='W'){
        // Trígono: três pontas de 80°, três quinas de 160°, simetria de 120°.
        var raw=[[0,0]],headings=[0,20,120,140,240],p=[0,0];
        headings.forEach(function(h){p=[p[0]+Math.cos(h*DEG),p[1]+Math.sin(h*DEG)];raw.push(p);});
        var center=raw.reduce((a,p)=>[a[0]+p[0]/6,a[1]+p[1]/6],[0,0]),apothem=distPoly(raw,center[0],center[1]),factor=positive(tool.insertWidth,12)/(2*apothem);
        raw=raw.map(p=>[factor*(p[0]*Math.cos(phi)-p[1]*Math.sin(phi)),factor*(p[0]*Math.sin(phi)+p[1]*Math.cos(phi))]);
        pts=pts.concat(raw.slice(1));
      }else pts.push(E1, far, E2);
      // referencia = canto do inserto real (zerado encostando na face e no Ø), nao o canto virtual:
      // sem compensacao de raio (G41/G42) o raio de ponta so deixa a sobra do canto, nao uma camada na face
      var zm = 1e9, rm = 1e9;
      pts.forEach(function (p) { if (p[0] < zm) zm = p[0]; if (p[1] < rm) rm = p[1]; });
      pts = pts.map(function (p) { return [p[0] - zm, p[1] - rm]; });
      if (C) nose = [C[0] - zm, C[1] - rm];
      if (tool.kind === 'interna') {
        // mandrilamento: a barra fica dentro do furo (lado do eixo, -r) e a pastilha corta para fora (+r);
        // espelha em r (ponta continua sendo o ponto programado) e mantem o sentido anti-horario
        pts = pts.map(function (p) { return [p[0], -p[1]]; }).reverse();
        if (nose) nose = [nose[0], -nose[1]];
      }
    }
    var mount=mounting(tool);if(mount.z!==1||mount.r!==1){pts=pts.map(p=>[p[0]*mount.z,p[1]*mount.r]);if(mount.z*mount.r<0)pts.reverse();if(nose)nose=[nose[0]*mount.z,nose[1]*mount.r];}
    // Referência do corretor: vetor centro -> ponta imaginária (Fanuc/Haas 1..9).
    var directions={1:[-1,-1],2:[1,-1],3:[1,1],4:[-1,1],5:[-1,0],6:[0,-1],7:[1,0],8:[0,1],9:[0,0]};
    var tip=tool.tip||(configurableCut(tool)?mount.tip:null);
    if(nose&&directions[tip]){var offset=directions[tip],radius=Number(tool.raio)||0,target=[offset[0]*radius,offset[1]*radius];pts=pts.map(function(p){return [p[0]+target[0]-nose[0],p[1]+target[1]-nose[1]];});nose=target;}
    // arestas
    var edges = [], zmin = 1e9, zmax = -1e9, rmin = 1e9, rmax = -1e9;
    for (i = 0; i < pts.length; i++) {
      var p = pts[i], q = pts[(i + 1) % pts.length];
      var ex = q[0] - p[0], ey = q[1] - p[1], len = Math.hypot(ex, ey);
      if (len > 1e-9) edges.push([p[0], p[1], ex, ey, len]);
      zmin = Math.min(zmin, p[0]); zmax = Math.max(zmax, p[0]); rmin = Math.min(rmin, p[1]); rmax = Math.max(rmax, p[1]);
    }
    return { pts: pts, edges: edges, bb: [zmin, zmax, rmin, rmax], nose: nose };
  }
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
  function simulationToolParts(f) {
    if(globalThis.CNCSim.configurableTool(f))return configuredParts(f);
    const pc=pecasFerr(f),shape=globalThis.CNCSim.toolShape(f),natural=globalThis.CNCSim.toolShape({...f,tip:undefined});
    const delta=shape.nose&&natural.nose?shape.nose.map((n,i)=>n-natural.nose[i]):[0,0],shift=p=>[p[0]+delta[0],p[1]+delta[1]];
    return {...pc,ins:shape.pts,hold:pc.hold.map(shift),furo:pc.furo?[...shift(pc.furo),pc.furo[2]]:null};
  }
  function hull(points){const sorted=points.toSorted((a,b)=>a[0]-b[0]||a[1]-b[1]),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p)}return out};return half(sorted).slice(0,-1).concat(half(sorted.toReversed()).slice(0,-1));}
  function configuredParts(f){
    const Sim=globalThis.CNCSim,canonical={...f,mount:f.mount==null?undefined:'auto',tip:undefined},base=Sim.toolShape(canonical),actual=Sim.toolShape(f),mount=Sim.mounting(f),internal=['interna','canalint','roscaint'].includes(f.kind),radial=['canalext','rosca'].includes(f.kind),thickness=Number(f.shankThickness)>0?Number(f.shankThickness):f.kind==='broca'?(f.largura||10)*.85:internal?12:16;
    const [zmin,zmax,rmin,rmax]=base.bb,cz=(zmin+zmax)/2,cr=(rmin+rmax)/2;let shaft,hold;
    if(f.kind==='broca'){shaft=rect(38,0,78,thickness/2);hold=shaft;}
    else{
      const vertical=f.kind==='rombo'&&f.holderOrientation==='vertical',kap=Number(f.ap),theta=Number.isFinite(kap)&&kap>0&&!['rombo','interna'].includes(f.kind)?(90-kap)*Math.PI/180:0,axis=vertical?[0,1]:radial?[Math.sin(theta),Math.cos(theta)]:[Math.cos(theta),(internal?-1:1)*Math.sin(theta)],normal=[-axis[1],axis[0]],origin=vertical?[cz,Math.max(2,rmax*.55)]:radial?[f.kind==='rosca'?(zmax-zmin)/2+thickness/4:cz,Math.max(2,rmax*.55)]:[Math.max(3,zmax*.65),f.kind==='canal'?cr:(internal?-1:1)*(thickness/2+1)],length=internal?70:55;
      if(['centro','esquerda','direita'].includes(f.insertSeat)){
        // Alinha a haste sob o inserto: a ponta programada e o polígono de corte ficam fixos.
        // Na haste vertical, esquerda/direita acompanham a tela, inclusive após espelhamento.
        const cross=normal.slice(),flip=Math.abs(axis[1])>Math.abs(axis[0])?cross[0]*mount.z>0:cross[1]*mount.r<0;
        if(flip){cross[0]*=-1;cross[1]*=-1;}
        const side=f.insertSeat==='esquerda'?1:f.insertSeat==='direita'?-1:0,shift=(cz-origin[0])*cross[0]+(cr-origin[1])*cross[1]-side*thickness/2;
        origin[0]+=shift*cross[0];origin[1]+=shift*cross[1];
      }
      const point=(distance,side)=>[origin[0]+axis[0]*distance+normal[0]*side,origin[1]+axis[1]*distance+normal[1]*side];shaft=[point(0,-thickness/2),point(length,-thickness/2),point(length,thickness/2),point(0,thickness/2)];
      const maxDistance=Math.max(...base.pts.map(p=>Math.hypot(...p))),seat=base.pts.filter(p=>Math.hypot(...p)>maxDistance*.4),pad=Math.max(.01,Math.min(zmax-zmin,rmax-rmin)/10);hold=hull(seat.concat(shaft,rect(cz-pad,cr-pad,cz+pad,cr+pad)));
    }
    const baseNose=base.nose?[base.nose[0]*mount.z,base.nose[1]*mount.r]:[0,0],delta=actual.nose?actual.nose.map((n,i)=>n-baseNose[i]):[0,0],pose=p=>[p[0]*mount.z+delta[0],p[1]*mount.r+delta[1]],furo=f.kind==='broca'?null:[...pose([cz,cr]),Math.min(1.7,(zmax-zmin)/8,(rmax-rmin)/8)];
    return {ins:actual.pts,hold:hold.map(pose),furo,shaft:shaft.map(pose),thickness};
  }

  function insideShape(sh, dz, dr) {
    var E = sh.edges;
    for (var i = 0; i < E.length; i++) {
      var e = E[i];
      if ((e[2] * (dr - e[1]) - e[3] * (dz - e[0])) < MARGEM * e[4]) return false;
    }
    return true;
  }
  function inPoly(poly, pz, pr) { // par-impar
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[i], b = poly[j];
      if ((a[1] > pr) !== (b[1] > pr) && pz < (b[0] - a[0]) * (pr - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }

  function distPoly(poly, pz, pr) { // menor distancia do ponto as arestas do poligono
    var best = 1e9;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var a = poly[j], b = poly[i], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
      var t = l2 ? Math.max(0, Math.min(1, ((pz - a[0]) * dx + (pr - a[1]) * dy) / l2)) : 0;
      var d = Math.hypot(pz - (a[0] + t * dx), pr - (a[1] + t * dy));
      if (d < best) best = d;
    }
    return best;
  }

  /* ---------- simulador ---------- */
  function Sim(scene) {
    var self = this;
    this.scene = scene;
    var B = scene.bruto, maq = scene.maq;
    // bruto cilindrico (d) ou com perfil: [{z0, z1, d, d1?}], de cima para baixo; d1 (opcional) = diametro em z1 (trecho conico)
    var perfil = B.perfil || null;
    this.rB = B.d / 2;
    if (perfil) perfil.forEach(function (s) { self.rB = Math.max(self.rB, s.d / 2, (s.d1 != null ? s.d1 : s.d) / 2); });
    function rAt(z) {
      if (!perfil) return B.d / 2;
      for (var q = 0; q < perfil.length; q++) {
        var s = perfil[q];
        if (z >= s.z1 && z <= s.z0) {
          if (s.d1 == null || s.z0 === s.z1) return s.d / 2;
          return (s.d + (s.d1 - s.d) * (s.z0 - z) / (s.z0 - s.z1)) / 2;
        }
      }
      return -1;
    }
    this.cs = 0.5;
    var chuck = scene.chuck;
    this.zlo = Math.min(B.z1, chuck ? chuck.zBack : B.z1) - 3;
    this.zhi = B.z0 + 20;
    this.rlo = -3;
    this.rhi = Math.max(this.rB, chuck ? chuck.rOut : 0) + 3;
    this.nz = Math.ceil((this.zhi - this.zlo) / this.cs);
    this.nr = Math.ceil((this.rhi - this.rlo) / this.cs);
    var n = this.nz * this.nr;
    this.mat0 = new Uint8Array(n);
    this.chk = new Uint8Array(n);
    this.prot = new Uint8Array(n);
    this.clear = new Uint8Array(n); // celulas que deveriam estar vazias no fim
    var i, j, cz, cr, k, rcol = new Float64Array(this.nz);
    for (i = 0; i < this.nz; i++) rcol[i] = rAt(this.zlo + (i + 0.5) * this.cs); // raio do bruto por coluna (uma vez so)
    // furos/cavidades: scene.holes = cavidades da peca ACABADA (poligonos z,r); B.vazios = cavidades que o bruto ja traz (feitas em outra operacao)
    var holes = scene.holes || [], vazios = B.vazios || [];
    function emLista(L, z, r) { for (var q = 0; q < L.length; q++) if (inPoly(L[q], z, r)) return true; return false; }
    function distLista(L, z, r) { var m = 1e9; for (var q = 0; q < L.length; q++) m = Math.min(m, distPoly(L[q], z, r)); return m; }
    for (j = 0; j < this.nr; j++) {
      cr = this.rlo + (j + 0.5) * this.cs;
      for (i = 0; i < this.nz; i++) {
        cz = this.zlo + (i + 0.5) * this.cs; k = j * this.nz + i;
        if (cz >= B.z1 && cz <= B.z0 && cr >= 0 && cr <= rcol[i] && !(vazios.length && emLista(vazios, cz, cr))) this.mat0[k] = 1;
        // placa: as castanhas seguram o diametro externo (r acima do bruto); atras da peca a placa e inteira. Dentro do furo nao ha castanha.
        if (chuck && cz >= chuck.zBack && cz <= chuck.zFace && cr <= chuck.rOut && (cz < B.z1 || rcol[i] < 0 || cr >= rcol[i] - 0.01)) this.chk[k] = 1;
        var naCav = holes.length && emLista(holes, cz, cr);
        if (this.mat0[k] && scene.protect && inPoly(scene.protect, cz, cr) && !naCav) this.prot[k] = 1;
        // "deveria estar vazia no fim": fora da peca acabada e a mais de 0,15 mm dela (ignora lascas de resolucao)
        if (!scene.semPerfil && this.mat0[k] && !this.prot[k] && !(scene.ignore && inPoly(scene.ignore, cz, cr)) && // semPerfil: programa colado, sem peca acabada para comparar
          (!scene.protect || distPoly(scene.protect, cz, cr) > 0.15) && (!naCav || distLista(holes, cz, cr) > 0.15)) this.clear[k] = 1;
      }
    }
    this.shapes = {};
    this.parts = {};
    Object.keys(scene.tools).forEach(function (key) { self.shapes[key] = toolShape(scene.tools[key]);self.parts[key]=simulationToolParts(scene.tools[key]); });

    // segmentos com tempo
    var pos = { x: scene.start.x, z: scene.start.z }, t = 0, segs = [];
    scene.path.forEach(function (m) {
      var dx = (m.x - pos.x) / 2, dz = m.z - pos.z, len = Math.hypot(dx, dz);
      if (!(len >= 1e-9)) return; // ignora movimento nulo ou com coordenada invalida (NaN): nao contamina o tempo de ciclo
      var tool = scene.tools[m.tool] || {}, rpm = 0, dur;
      if (m.t === 'r') dur = len / ((maq.rapido || 20000) / 60);
      else {
        rpm = self.rpmAt((pos.x + m.x) / 2, m.spin || tool); // m.spin: G96/G97 e S do proprio programa (modulo Simulacao)
        dur = len / Math.max(1e-6, (m.f || 0.1) * rpm / 60);
      }
      segs.push({ x0: pos.x, z0: pos.z, x1: m.x, z1: m.z, len: len, t0: t, dur: dur, type: m.t, line: m.line, tool: m.tool, label: m.label || '', f: m.f || 0, rpm: rpm, dec: m.dec || '',pass:m.pass,passes:m.passes,cutContext:m.cutContext });
      t += dur; pos = { x: m.x, z: m.z };
    });
    this.segs = segs; this.total = t;
    // grupos por linha de G-code (para passo a passo)
    var groups = [];
    segs.forEach(function (s, idx) {
      var g = groups[groups.length - 1];
      if (g && g.line === s.line&&g.pass===s.pass) { g.t1 = s.t0 + s.dur; g.last = idx; }
      else groups.push({ line: s.line,pass:s.pass, t0: s.t0, t1: s.t0 + s.dur, first: idx, last: idx });
    });
    this.groups = groups;
    this.reset();
  }

  Sim.prototype.rpmAt = function (x, tool) {
    var lim = Number(tool.rpm) || 2000;
    if (tool.modo === 'G97') return lim;
    var vc = Number(tool.vc) || 100;
    return Math.min(lim, 1000 * vc / (Math.PI * Math.max(Math.abs(x), 1)));
  };

  Sim.prototype.reset = function () {
    this.mat = new Uint8Array(this.mat0);
    this.t = 0;
  };

  Sim.prototype.posAt = function (t) {
    var segs = this.segs;
    if (!segs.length) return { x: this.scene.start.x, z: this.scene.start.z, seg: -1 };
    t = Math.max(0, Math.min(this.total, t));
    // busca binaria
    var lo = 0, hi = segs.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (segs[mid].t0 < t) lo = mid; else hi = mid - 1; } // estrito: no limite entre movimentos vale o que acabou de executar
    var s = segs[lo], u = s.dur > 0 ? Math.min(1, Math.max(0, (t - s.t0) / s.dur)) : 1;
    if (t < segs[0].t0) { return { x: this.scene.start.x, z: this.scene.start.z, seg: 0, s: segs[0] }; }
    return { x: s.x0 + (s.x1 - s.x0) * u, z: s.z0 + (s.z1 - s.z0) * u, seg: lo, s: s, u: u };
  };

  // percorre [t0,t1] chamando fn(seg, x, z) a cada passo
  Sim.prototype._walk = function (t0, t1, fn) {
    var segs = this.segs;
    for (var i = Math.max(0,this.posAt(t0).seg||0); i < segs.length; i++) {
      var s = segs[i], e = s.t0 + s.dur;
      if (e <= t0) continue;
      if (s.t0 >= t1) break;
      var u0 = Math.max(0, (t0 - s.t0) / s.dur), u1 = Math.min(1, (t1 - s.t0) / s.dur);
      var stepLen = s.type === 'f' ? this.cs / 2 : this.cs;
      var n = Math.max(1, Math.ceil(s.len * (u1 - u0) / stepLen));
      for (var k = 1; k <= n; k++) {
        var u = u0 + (u1 - u0) * k / n;
        fn(s, i, s.x0 + (s.x1 - s.x0) * u, s.z0 + (s.z1 - s.z0) * u, s.t0 + s.dur * u);
      }
    }
  };

  // aplica a ferramenta em (x,z); cut = remove material; devolve contadores
  Sim.prototype._stamp = function (key, x, z, cut, info) {
    var sh = this.shapes[key]; if (!sh) return;
    var tz = z, tr = x / 2, bb = sh.bb, cs = this.cs;
    var i0 = Math.max(0, Math.floor((tz + bb[0] - this.zlo) / cs)), i1 = Math.min(this.nz - 1, Math.floor((tz + bb[1] - this.zlo) / cs));
    var j0 = Math.max(0, Math.floor((tr + bb[2] - this.rlo) / cs)), j1 = Math.min(this.nr - 1, Math.floor((tr + bb[3] - this.rlo) / cs));
    var mat = this.mat, chk = this.chk, prot = this.prot;
    for (var j = j0; j <= j1; j++) {
      var cr = this.rlo + (j + 0.5) * cs - tr;
      for (var i = i0; i <= i1; i++) {
        var k = j * this.nz + i;
        if (!mat[k] && !chk[k]) continue;
        var cz = this.zlo + (i + 0.5) * cs - tz;
        if (!insideShape(sh, cz, cr)) continue;
        if (chk[k]) { if (info){info.chuck++;info.chuckPoint??={x:2*(tr+cr),z:tz+cz};} continue; }
        if(info&&cut&&info.engagement){
          var e=info.engagement,depth=cz*e.normal[0]+cr*e.normal[1]-e.front;
          if(e.limit>0&&depth>e.limit+e.tolerance){info.overload++;info.maxDepth=Math.max(info.maxDepth,depth);info.overloadPoint??={x:2*(tr+cr),z:tz+cz};}
          if(e.remote(cz,cr)){info.remote++;info.remotePoint??={x:2*(tr+cr),z:tz+cz};}
        }
        if (cut) { mat[k] = 0; if (info && prot[k]) info.gouge++; }
        else if (info) info.mat++;
      }
    }
  };

  // Porta-ferramenta contra o material que ainda existe ANTES do corte da pastilha.
  // A região coberta pelo inserto pertence ao inserto, não à haste desenhada atrás dele.
  Sim.prototype._bodyContact = function(key,x,z,info){
    var parts=this.parts[key],shape=this.shapes[key];if(!parts||!shape)return;
    var poly=parts.hold,bb=[Math.min(...poly.map(p=>p[0])),Math.max(...poly.map(p=>p[0])),Math.min(...poly.map(p=>p[1])),Math.max(...poly.map(p=>p[1]))],cs=this.cs,tr=x/2;
    var i0=Math.max(0,Math.floor((z+bb[0]-this.zlo)/cs)),i1=Math.min(this.nz-1,Math.floor((z+bb[1]-this.zlo)/cs));
    var j0=Math.max(0,Math.floor((tr+bb[2]-this.rlo)/cs)),j1=Math.min(this.nr-1,Math.floor((tr+bb[3]-this.rlo)/cs));
    for(var j=j0;j<=j1;j++)for(var i=i0;i<=i1;i++){
      var k=j*this.nz+i;if(!this.mat[k]&&!this.chk[k])continue;
      var dz=this.zlo+(i+.5)*cs-z,dr=this.rlo+(j+.5)*cs-tr;
      if(!inPoly(poly,dz,dr)||distPoly(poly,dz,dr)<=MARGEM||inPoly(shape.pts,dz,dr))continue;
      if(this.chk[k]){info.bodyChuck++;info.bodyChuckPoint??={x:2*(tr+dr),z:z+dz};}else{info.body++;info.bodyPoint??={x:2*(tr+dr),z:z+dz};}
    }
  };

  // Incremento do banco: profundidade no raio no torneamento, em Z no faceamento.
  // Canal/bedame cortam com TODA a aresta frontal: largura não é excesso de incremento.
  function engagementProfile(tool,s,shape,cs){
    if(!shape||tool.kind==='broca')return null;
    var groove=['canal','canalext','canalint'].includes(tool.kind),thread=['rosca','roscaint'].includes(tool.kind),mount=mounting(tool),signR=['interna','canalint','roscaint'].includes(tool.kind)?-1:1;
    var dx=(s.x1-s.x0)/2,dz=s.z1-s.z0,axial=Math.abs(dz)>=Math.abs(dx),normal=axial?[0,1]:[1,0],center=shape.pts.reduce((a,p)=>[a[0]+p[0]/shape.pts.length,a[1]+p[1]/shape.pts.length],[0,0]);
    if(center[0]*normal[0]+center[1]*normal[1]<0)normal=normal.map(v=>-v);
    var cycle=s.cutContext,programLimit=cycle&&cycle.depth>0?Number(cycle.depth):0,axis=programLimit>0?cycle.axis:axial?'r':'z';
    normal=axis==='z'?[Math.sign(center[0])||mount.z,0]:[0,Math.sign(center[1])||signR*mount.r];
    var front=Math.min(...shape.pts.map(p=>p[0]*normal[0]+p[1]*normal[1])),bankLimit=groove||thread?0:axis==='r'?Number(tool.incTorn):Number(tool.incFace),limit=bankLimit>0?bankLimit:0;
    if(programLimit>0&&!groove&&!thread)limit=limit>0?Math.min(limit,programLimit):programLimit;
    var radius=Number(tool.raio)||0,ic=positive(tool.insertWidth,12),configuredIncrement=groove?tool.incCanal:limit,reach=Math.max(ic*.55,2*radius+(Number(configuredIncrement)||0)/Math.max(.25,Math.sin((Number(tool.ang)||80)*DEG/2)));
    var nose=shape.nose||[0,0],grooveAxis=groove?(tool.kind==='canal'?[mount.z,0]:[0,signR*mount.r]):null;
    return {normal,front,limit:Number(limit)||0,axis,source:programLimit>0?(bankLimit>0&&bankLimit<programLimit?'banco':cycle.cycle):'banco',tolerance:cs*.8+MARGEM,remote:function(z,r){
      if(groove){
        var back=z*grooveAxis[0]+r*grooveAxis[1],length=positive(tool.insertLength,tool.kind==='canalint'?8:tool.kind==='canal'?12:14);
        // Sem falso alerta na largura inteira: somente o corpo atrás da aresta ativa.
        return back>Math.max(Number(tool.raioPerfil)||0,Math.min(length*.55,positive(tool.incCanal,1)))+cs*.8;
      }
      if(thread)return Math.hypot(z,r)>Math.max(2,ic*.55)+cs;
      // A outra ponta e a parte posterior da pastilha não são a zona de corte da ponta escolhida.
      return Math.hypot(z-nose[0],r-nose[1])>reach+radius+cs;
    }};
  }

  // avanca a simulacao ate t (se t menor que o atual, recomeca)
  Sim.prototype.seek = function (t) {
    t = Math.max(0, Math.min(this.total, t));
    if (t < this.t) this.reset();
    var self = this,last=-1;
    this._walk(this.t, t, function (s, i, x, z) {
      if(i!==last){last=i;if(s.type==='f'&&s.t0>=self.t)self._stamp(s.tool,s.x0,s.z0,true,null);}
      if (s.type === 'f') self._stamp(s.tool, x, z, true, null);
    });
    this.t = t;
    return this.state();
  };

  Sim.prototype.state = function () {
    var p = this.posAt(this.t), s = p.s;
    return { t: this.t, x: p.x, z: p.z, seg: p.seg, line: s ? s.line : -1, type: s ? s.type : 'r', tool: s ? s.tool : 'a', label: s ? s.label : '', f: s ? s.f : 0, rpm: s ? s.rpm : 0, dec: s ? s.dec : '',pass:s?s.pass:null,passes:s?s.passes:null };
  };

  // analise completa: tempos e alertas
  Sim.prototype.analyze = function () {
    var self = this, sc = this.scene, maq = sc.maq, alerts = [], seen = {};
    var saveMat = this.mat, saveT = this.t;
    this.mat = new Uint8Array(this.mat0);
    // um alerta por (tipo, linha do G-code); repeticoes viram contagem
    function add(type, s, i, x, z, text, tt,contact) {
      var key = type + ':' + s.line;
      if (seen[key]) { seen[key].n++; return; }
      var a = { type: type, t: tt, seg: i, line: s.line, x: x, z: z, text: text, label: s.label, n: 1,contact:contact||null };
      seen[key] = a;
      if (alerts.length < 60) alerts.push(a);
    }
    // limites minimos de sobreposicao (celulas de 0,25 mm2): evita ruido de raspadas de decimos de mm
    var MIN_RAPIDO = 6, MIN_PECA = 3, MIN_CONTACT = 1,lastSegment=-1,engagement=null,unverifiedDepth={};
    function inspect(s,i,x,z,tt){
      var info = { chuck:0,gouge:0,mat:0,body:0,bodyChuck:0,remote:0,overload:0,maxDepth:0,engagement };
      self._bodyContact(s.tool,x,z,info);
      self._stamp(s.tool, x, z, s.type === 'f', info);
      if (info.chuck||info.bodyChuck) add('placa', s, i, x, z, 'Colisão '+(info.bodyChuck?'da haste / suporte':'do inserto')+' com a placa (castanhas) em X' + fx(x) + ' Z' + fx(z), tt,info.bodyChuckPoint||info.chuckPoint);
      if(info.body>=MIN_CONTACT)add('haste',s,i,x,z,'Haste / suporte em contato com o material em X'+fx(x)+' Z'+fx(z),tt,info.bodyPoint);
      if(info.overload>=MIN_CONTACT)add('incremento',s,i,x,z,'Engajamento do inserto ≈ '+fx(info.maxDepth)+' mm excede o incremento '+(engagement.axis==='r'?'de torneamento no raio':'de faceamento em Z')+' de '+fx(engagement.limit)+' mm ('+engagement.source+') em X'+fx(x)+' Z'+fx(z),tt,info.overloadPoint);
      if(info.remote>=MIN_CONTACT)add('inserto',s,i,x,z,'Contato em região do inserto afastada da ponta / aresta de corte em X'+fx(x)+' Z'+fx(z),tt,info.remotePoint);
      if (info.gouge >= MIN_PECA) add('peca', s, i, x, z, 'Corte dentro da peça acabada em X' + fx(x) + ' Z' + fx(z), tt);
      if (s.type === 'r' && info.mat >= MIN_RAPIDO) add('rapido', s, i, x, z, 'Avanço rápido (G0) dentro do material em X' + fx(x) + ' Z' + fx(z), tt);
      if (maq.xMax && x > maq.xMax) add('limite', s, i, x, z, 'X' + fx(x) + ' passa do curso de X (' + maq.xMax + ')', tt);
      if (x < -5) add('limite', s, i, x, z, 'X' + fx(x) + ' abaixo do centro', tt);
      if (maq.zMax && z > maq.zMax) add('limite', s, i, x, z, 'Z' + fx(z) + ' passa do curso de Z (+' + maq.zMax + ')', tt);
      if (maq.zMin != null && z < maq.zMin) add('limite', s, i, x, z, 'Z' + fx(z) + ' abaixo do curso de Z (' + maq.zMin + ')', tt);
    }
    this._walk(0,this.total,function(s,i,x,z,tt){
      if(i!==lastSegment){lastSegment=i;var tool=sc.tools[s.tool]||{};engagement=engagementProfile(tool,s,self.shapes[s.tool],self.cs);if(s.type==='f'&&engagement&&!(engagement.limit>0)&&['rombo','interna'].includes(tool.kind))unverifiedDepth[s.tool+':'+engagement.axis]={tool:s.tool,axis:engagement.axis};inspect(s,i,s.x0,s.z0,s.t0);}
      inspect(s,i,x,z,tt);
    });
    // alerta com o tempo exato do primeiro passo problemático: usa t0 do segmento
    alerts.forEach(function (a) {
      if (a.n > 1) a.text += ' (e mais ' + (a.n - 1) + ' ponto' + (a.n > 2 ? 's' : '') + ' nesta linha)';
    });
    alerts.sort(function (a, b) { return a.t - b.t; });
    // sobra de material
    var left = 0, k, cs = this.cs, nz = this.nz, nr = this.nr, seen2 = new Uint8Array(this.mat.length), big = { n: 0, sz: 0, sr: 0 };
    for (k = 0; k < this.mat.length; k++) {
      if (!(this.clear[k] && this.mat[k])) continue;
      left++;
      if (seen2[k]) continue;
      // aglomerado conectado (8 vizinhos) de celulas que deveriam estar vazias
      var stack = [k], cnt = 0, sz = 0, sr = 0; seen2[k] = 1;
      while (stack.length) {
        var c = stack.pop(), ci = c % nz, cj = (c - ci) / nz; cnt++; sz += ci; sr += cj;
        for (var dj = -1; dj <= 1; dj++) for (var di = -1; di <= 1; di++) {
          var ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= nz || nj >= nr) continue;
          var nk = nj * nz + ni; if (seen2[nk] || !(this.clear[nk] && this.mat[nk])) continue;
          seen2[nk] = 1; stack.push(nk);
        }
      }
      if (cnt > big.n) big = { n: cnt, sz: sz / cnt, sr: sr / cnt };
    }
    var area = left * cs * cs, bigArea = big.n * cs * cs;
    // a folga da aresta da pastilha (ex.: 80 graus => 10 graus) deixa uma cunha normal no ombro
    var ta = sc.tools.a, cunha = 0;
    if (ta && ta.kind === 'rombo' && sc.hStock > 0) cunha = 0.5 * sc.hStock * sc.hStock * Math.tan((90 - (ta.ang || 80)) * DEG);
    if (bigArea > 4 + 1.3 * cunha) {
      var bz = this.zlo + (big.sz + 0.5) * cs, bx = 2 * (this.rlo + (big.sr + 0.5) * cs);
      alerts.push({ type: 'sobra', t: this.total, seg: this.segs.length - 1, line: -1, x: bx, z: bz, text: 'Sobra de material no fim do programa: maior região ≈ ' + bigArea.toFixed(1) + ' mm² perto de X' + fx(bx) + ' Z' + fx(bz) + '. Confira incrementos, comprimento da pastilha e o perfil.', label: '' });
    }
    // tempos
    var tCut = 0, tRap = 0, dCut = 0, dRap = 0;
    this.segs.forEach(function (s) { if (s.type !== 'r') { tCut += s.dur; dCut += s.len; } else { tRap += s.dur; dRap += s.len; } });
    this.mat = saveMat; this.t = saveT;
    return { alerts: alerts, total: this.total, tCut: tCut, tRapid: tRap, dCut: dCut, dRapid: dRap, sobraArea: area,unverifiedDepth:Object.values(unverifiedDepth) };
  };
  function fx(v) { return (Math.round(v * 100) / 100).toString(); }

  Sim.prototype.toolPoly = function (key, x, z) {
    var sh = this.shapes[key]; if (!sh) return [];
    return sh.pts.map(function (p) { return [z + p[0], x / 2 + p[1]]; });
  };

  return { Sim: Sim, toolShape: toolShape, inPoly: inPoly, mounting:mounting, configurableTool:configurableTool, pecasFerr:pecasFerr, simulationToolParts:simulationToolParts };
});



