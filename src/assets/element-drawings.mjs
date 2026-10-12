// Croquis e pictogramas originais da base 2.15.0, adaptados para React.
const fmt=n=>globalThis.CNC.fmt(n);
  var AX = 190;
  function tk(x, y, v) { return v ? 'M' + x + ' ' + (y - 4) + 'V' + (y + 4) : 'M' + (x - 4) + ' ' + y + 'H' + (x + 4); }
  function dH(x1, x2, y, ya, yb) { return '<path class="ext" d="M' + x1 + ' ' + ya + 'V' + (y - 5) + 'M' + x2 + ' ' + yb + 'V' + (y - 5) + '"/><path class="dim" d="M' + x1 + ' ' + y + 'H' + x2 + tk(x1, y, 1) + tk(x2, y, 1) + '"/>'; }
  function dV(y1, y2, x, xa, xb) { return '<path class="ext" d="M' + xa + ' ' + y1 + 'H' + (xa > x ? x + 5 : x - 5) + 'M' + xb + ' ' + y2 + 'H' + (xb > x ? x + 5 : x - 5) + '"/><path class="dim" d="M' + x + ' ' + y1 + 'V' + y2 + tk(x, y1, 0) + tk(x, y2, 0) + '"/>'; }
  var ld = function (d) { return '<path class="lead" d="' + d + '"/>'; };
  var BLK = '<polygon class="piece" points="96,190 96,72 240,72 240,190"/>';
  var cav = function (p) { return p.charAt(0) === 'M' ? '<path class="cav" d="' + p + '"/>' : '<polygon class="cav" points="' + p + '"/>'; };
  function coneHeights(it,height) { var a=Number(it.a),b=Number(it.b);a=isFinite(a)&&a>0?a:0;b=isFinite(b)&&b>0?b:0;var max=Math.max(a,b,1);return {a:AX-height*a/max,b:AX-height*b/max}; }
  var DW = {
    cil: function () { return { svg: '<polygon class="piece" points="96,190 96,78 240,78 240,190"/>' + dV(78, 190, 74, 96, 96) + dH(96, 240, 52, 78, 78), box: { a: [36, 134], b: [168, 26] } }; },
    cone: function (it) { var y=coneHeights(it,106);return { svg: '<polygon class="piece" points="96,190 96,'+y.b+' 240,'+y.a+' 240,190"/>' + dV(y.a, 190, 262, 240, 240) + dV(y.b, 190, 74, 96, 96) + dH(96, 240, 52, y.b, y.a), box: { a: [304, (y.a+AX)/2], b: [36, (y.b+AX)/2], c: [168, 26] } }; },
    canal: function (it, zc) { return { semFace: true, svg: '<polygon class="piece" points="96,190 96,78 106,78 106,130 150,130 150,78 240,78 240,190"/><path class="ext" d="M106 78H150"/><path class="ext" d="M150 190V216"/>' + dV(130, 190, 74, 106, 106) + dH(106, 150, 52, 78, 78) + '<text x="150" y="227" text-anchor="middle">começa em Z' + fmt(zc) + '</text><text x="195" y="170" text-anchor="middle">anterior</text>', box: { a: [36, 160], c: [128, 26] } }; },
    canalz: function () { return { svg: '<polygon class="piece" points="96,190 96,78 146,78 146,130 190,130 190,78 240,78 240,190"/>' + dV(130, 190, 74, 146, 146) + dH(190, 240, 52, 78, 78) + dH(146, 190, 52, 78, 78) + ld('M246 40L222 52M160 40L166 52'), box: { a: [36, 160], b: [262, 26], c: [150, 26] } }; },
    rosca: function () { return { svg: '<polygon class="piece" points="96,190 96,78 114,78 123,70 132,78 141,70 150,78 159,70 168,78 177,70 186,78 195,70 204,78 213,70 222,78 240,78 240,190"/>' + dV(78, 190, 74, 96, 96) + dH(96, 240, 52, 78, 78) + '<path class="dim" d="M123 70V58M141 70V58"/><text x="132" y="54" text-anchor="middle">passo</text>', box: { a: [36, 134], b: [168, 26], c: [190, 58] } }; },
    furo: function () { return { svg: BLK + cav('240,190 240,130 150,130 130,190') + dV(130, 190, 262, 240, 240) + dH(150, 240, 44, 130, 72), box: { a: [304, 160], b: [195, 20] } }; },
    icil: function () { return { svg: BLK + cav('240,190 240,120 140,120 140,190') + dV(120, 190, 262, 240, 240) + dH(140, 240, 44, 120, 72), box: { a: [304, 155], b: [190, 20] } }; },
    icone: function (it) { var y=coneHeights(it,78);return { svg: BLK + cav('240,190 240,'+y.a+' 130,'+y.b+' 130,190') + dV(y.a, 190, 262, 240, 240) + dV(y.b, 190, 74, 130, 130) + dH(130, 240, 44, y.b, 72), box: { a: [304, (y.a+AX)/2], b: [36, (y.b+AX)/2], c: [185, 20] } }; },
    irosca: function () { return { svg: BLK + cav('240,190 240,128 222,128 213,120 204,128 195,120 186,128 177,120 168,128 159,120 150,128 140,128 140,190') + dV(120, 190, 262, 240, 240) + dH(140, 240, 44, 128, 72), box: { a: [304, 150], b: [190, 20], c: [150, 74] } }; },
    icanal: function (it, zc) { return { semFace: true, svg: BLK + cav('240,190 240,128 190,128 190,94 150,94 150,128 130,128 130,190') + '<path class="ext" d="M190 190V216"/>' + dV(94, 190, 262, 190, 190) + dH(150, 190, 44, 94, 94) + '<text x="190" y="227" text-anchor="middle">começa em Z' + fmt(zc) + '</text><text x="215" y="165" text-anchor="middle">anterior</text>', box: { a: [304, 135], c: [140, 20] } }; }
  };
  // pictogramas (face a direita)
  var IC = {
    cil: '<rect class="wk" x="12" y="10" width="40" height="24"/>',
    cone: '<polygon class="wk" points="12,34 12,18 52,8 52,34"/>',
    chanfro: '<polygon class="wk" points="12,34 12,10 40,10 52,22 52,34"/>',
    raio: '<path class="wk" d="M12 34V10H34A18 18 0 0 1 52 28V34Z"/>',
    canal: '<polygon class="wk" points="12,34 12,10 26,10 26,24 38,24 38,10 52,10 52,34"/>',
    rosca: '<polygon class="wk" points="12,34 12,16 19,10 26,16 33,10 40,16 47,10 52,13 52,34"/>',
    furo: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,24 30,24 24,38"/>',
    icil: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,22 26,22 26,38"/>',
    icone: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,16 26,26 26,38"/>',
    ichanfro: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,16 48,24 26,24 26,38"/>',
    iraio: '<rect class="wk" x="8" y="6" width="48" height="32"/><path class="cv" d="M56 38V16A8 8 0 0 0 48 24H26V38Z"/>',
    icanal: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,24 40,24 40,16 32,16 32,24 26,24 26,38"/>',
    irosca: '<rect class="wk" x="8" y="6" width="48" height="32"/><polygon class="cv" points="56,38 56,22 50,16 44,22 38,16 32,22 26,22 26,38"/>'
  };

export const elementIcons=IC;
export function elementDrawing(type,item,z=0){return DW[type]?.(item,z)}

  var EL = {
    cil: { g: 'ext', l: 'trechos', nome: 'Cilindro', d: { a: 40, b: 20 }, dica: 'Ø do cilindro e quanto ele avança em Z a partir do trecho anterior (o primeiro começa na face, Z0).' },
    cone: { g: 'ext', l: 'trechos', nome: 'Cone', d: { a: 40, b: 60, c: 10 }, dica: 'Ø inicial (lado da face), Ø final (lado do fundo) e o comprimento em Z.' },
    chanfro: { g: 'ext', l: 'trechos', nome: 'Chanfro', marca: true, d: { a: 1 }, dica: 'Chanfro a 45° no canto escolhido no desenho; o tamanho é o cateto.' },
    raio: { g: 'ext', l: 'trechos', nome: 'Raio', marca: true, d: { a: 1 }, dica: 'Arredondamento do canto escolhido no desenho.' },
    canal: { g: 'ext', l: 'trechos', nome: 'Canal', d: { a: 30, c: 4.5, seq: true }, rot: ['Ø do fundo', 'Largura'], keys: ['a', 'c'], dica: 'Entra logo depois do último elemento (que precisa ser um cilindro) e ocupa a largura do canal; o próximo elemento começa depois dele. Largura maior ou igual à da ferramenta de canal.' },
    canalz: { g: 'ext', l: 'trechos', oculto: true, nome: 'Canal', rot: ['Ø do fundo', 'Posição Z', 'Largura'], dica: 'Canal do formato antigo: a posição Z é medida da face (Z0). Para o formato sequencial, apague e adicione de novo.' },
    rosca: { g: 'ext', l: 'trechos', nome: 'Rosca externa', d: { a: 30, b: 20, c: 2 }, rot: ['Ø nominal', 'Comprimento da rosca', 'Passo'], dica: 'Rosca métrica ISO de 60° em G76. O cilindro é torneado no Ø nominal e o G76 desce 0,61343 × passo. Coloque um Canal logo depois dela (alívio) para a ferramenta sair.' },
    furo: { g: 'int', l: 'internos', nome: 'Furo (broca)', d: { a: 18, b: 70 }, dica: 'Furo feito com broca no centro: Ø e profundidade a partir da face. Só um por lado.' },
    icil: { g: 'int', l: 'internos', nome: 'Cilindro interno', d: { a: 24, b: 30 }, dica: 'Mandrilamento: Ø e comprimento a partir da face. Perfil escalonado = vários cilindros internos, um depois do outro (Ø não aumenta para o fundo).' },
    icone: { g: 'int', l: 'internos', nome: 'Cone interno', d: { a: 24, b: 18, c: 20 }, dica: 'Ø na boca (lado da face), Ø no fundo e comprimento.' },
    ichanfro: { g: 'int', l: 'internos', nome: 'Chanfro interno', marca: true, d: { a: 1 }, dica: 'Chanfro a 45° no canto escolhido no desenho (entrada, degrau ou fundo).' },
    iraio: { g: 'int', l: 'internos', nome: 'Raio interno', marca: true, d: { a: 1 }, dica: 'Arredondamento do canto escolhido no desenho (entrada, degrau ou fundo).' },
    icanal: { g: 'int', l: 'internos', nome: 'Canal interno', d: { a: 30, c: 4.5, seq: true }, rot: ['Ø do fundo', 'Largura'], keys: ['a', 'c'], dica: 'Entra logo depois do último cilindro interno (ele ocupa o fim desse cilindro); o próximo elemento começa depois do canal. Ø do fundo maior que o do cilindro; largura maior ou igual à da ferramenta de canal interno.' },
    irosca: { g: 'int', l: 'internos', nome: 'Rosca interna', d: { a: 30, b: 20, c: 2 }, rot: ['Ø nominal', 'Comprimento da rosca', 'Passo'], dica: 'Rosca métrica ISO de 60° em G76. O furo é mandrilado no Ø menor (Ø nominal − 1,0825 × passo) e o G76 sobe até o Ø nominal. Coloque um Canal interno depois dela (alívio).' }
  };

export const elementDefinitions=EL;
