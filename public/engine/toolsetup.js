/* Geometria no banco; posição e corretor pertencem ao trabalho. */
(function(root,factory){var api=factory(typeof module==='object'&&module.exports?require('./core.js'):root.CNC);root.CNCToolSetup=api;if(typeof module==='object'&&module.exports)module.exports=api;})(globalThis,function(CNC){
 'use strict';
 function splitCode(code){var s=String(code||'').replace(/\D/g,'').padStart(4,'0').slice(-4);return {code:s,position:s.slice(0,2),offset:s.slice(2)};}
 function composeCode(position,offset){
  if(!/^\d{1,2}$/.test(String(position))||Number(position)<1||Number(position)>99)throw Error('Informe posição da torre de 1 a 99.');
  if(!/^\d{1,2}$/.test(String(offset))||Number(offset)<1||Number(offset)>99)throw Error('Informe corretor de 1 a 99.');
  return String(position).padStart(2,'0')+String(offset).padStart(2,'0');
 }
 function defaultTip(tool){var tips={inferior_esquerdo:3,inferior_direito:4,superior_esquerdo:2,superior_direito:1},position=tool&&tool.posicaoInserto;return Object.hasOwn(tips,position)?tips[position]:(tool&&tool.tipo==='interna'?2:3);}
 // Apenas o novo padrão explícito é usado. O T legado continua preservado como dado histórico.
 function standardCode(tool){var code=String(tool&&tool.tPadrao||'');return /^[0-9]{4}$/.test(code)&&Number(code.slice(0,2))>0&&Number(code.slice(2))>0?splitCode(code):null;}
 function slotSetup(form,type,slot,index,tool){var code=standardCode(tool);return Object.assign({position:code?code.position:String(index+1),offset:code?code.offset:String(index+1),tip:String(defaultTip(tool))},form.toolSetupByTipo&&form.toolSetupByTipo[type]&&form.toolSetupByTipo[type][slot]||{});}
 function validateMountings(entries){
  var positions={},errors=[],keys=['tipo','formatoInserto','pastilha','raio','angulo','apSuporte','largura','diametro','larguraInserto','comprimentoInserto','espessuraHaste','posicaoInserto','assentoInserto','orientacaoSuporte','orient','perfilCorte','raioCorte'];
  function geometry(tool){return JSON.stringify(keys.map(function(key){var value=tool[key];if(key==='tipo'&&value==='faceamento')value='externa';return value==null||value===''?null:typeof value==='number'?String(value):String(value).trim();}));}
  entries.forEach(function(entry){if(!entry.tool)return;var position=splitCode(entry.tool.t).position,previous=positions[position];
   if(previous&&geometry(previous.tool)!==geometry(entry.tool))errors.push('Posição '+position+' da torre usada por geometrias diferentes: '+previous.label+' e '+entry.label+'. Escolha posições distintas ou a mesma geometria física.');
   else positions[position]=entry;
  });return errors;
 }
 function programTool(state,tools,reference){
  if(Object.prototype.hasOwnProperty.call(state.ferr||{},reference.codigo))return tools.find(function(t){return t.id===state.ferr[reference.codigo];});
  if(reference.codigo==='0000')return undefined;
  var byCode=tools.filter(function(t){var code=standardCode(t);return code&&code.code===reference.codigo;});
  if(byCode.length){var typed=byCode.filter(function(t){return t.tipo===(reference.sug&&reference.sug.tipo);});return typed.length===1?typed[0]:byCode.length===1?byCode[0]:undefined;}
  var matches=tools.filter(function(t){return t.tipo===(reference.sug&&reference.sug.tipo);});
  return matches.length===1?matches[0]:undefined;
 }
 function programOrientation(state,reference,tool){var allowed=tool&&tool.tipo==='bedame'?['canalext','canal','canalint']:tool&&tool.tipo==='encaixe'?['canal','canalext','canalint']:tool&&tool.tipo==='rosca'?['rosca','roscaint']:[],saved=(state.orient||{})[reference.codigo];return allowed.includes(saved)?saved:allowed.includes(tool&&tool.orient)?tool.orient:allowed.includes(reference.sug&&reference.sug.orient)?reference.sug.orient:allowed[0];}
 function programGeometry(state,tools,reference){
  var tool=programTool(state,tools,reference);if(!tool)return undefined;
  var setup=(state.setup||{})[reference.codigo]||{},copy=Object.assign({},CNC.normalizeInsert(tool));
  if(setup.radius!==''&&setup.radius!=null){var radius=Number(setup.radius);if(tool.formatoInserto==='R'&&Math.abs(radius-copy.raio)>1e-8)throw Error('T'+reference.codigo+': no inserto redondo, o raio deve ser metade do IC.');if(!Number.isFinite(radius)||radius<0)throw Error('T'+reference.codigo+': informe raio do corretor válido.');copy.raio=radius;}
  if(copy.formatoInserto!=='R'&&['externa','faceamento','interna'].includes(tool.tipo)&&Number(copy.larguraInserto)>0&&Number(copy.raio)>=Number(copy.larguraInserto)/(1+Math.cos((Number(copy.angulo)||80)*Math.PI/180)))throw Error('T'+reference.codigo+': o raio do corretor não cabe na largura e no ângulo do inserto.');
  if(setup.tip!==''&&setup.tip!=null){copy.tip=Number(setup.tip);if(!Number.isInteger(copy.tip)||copy.tip<1||copy.tip>9)throw Error('T'+reference.codigo+': informe ponta do corretor de 1 a 9.');}
  else if(['externa','faceamento','interna'].includes(tool.tipo))copy.tip=defaultTip(tool);
  copy.t=reference.codigo;
  return copy;
 }
 return {splitCode:splitCode,composeCode:composeCode,standardCode:standardCode,slotSetup:slotSetup,validateMountings:validateMountings,defaultTip:defaultTip,programTool:programTool,programOrientation:programOrientation,programGeometry:programGeometry};
});
