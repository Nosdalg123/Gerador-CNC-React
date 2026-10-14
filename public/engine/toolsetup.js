/* Geometria no banco; posição e corretor pertencem ao trabalho. */
(function(root,factory){var api=factory();root.CNCToolSetup=api;if(typeof module==='object'&&module.exports)module.exports=api;})(globalThis,function(){
 'use strict';
 function splitCode(code){var s=String(code||'').replace(/\D/g,'').padStart(4,'0').slice(-4);return {code:s,position:s.slice(0,2),offset:s.slice(2)};}
 function composeCode(position,offset){
  if(!/^\d{1,2}$/.test(String(position))||Number(position)<1||Number(position)>99)throw Error('Informe posição da torre de 1 a 99.');
  if(!/^\d{1,2}$/.test(String(offset))||Number(offset)<1||Number(offset)>99)throw Error('Informe corretor de 1 a 99.');
  return String(position).padStart(2,'0')+String(offset).padStart(2,'0');
 }
 function defaultTip(tool){var tips={inferior_esquerdo:3,inferior_direito:4,superior_esquerdo:2,superior_direito:1},position=tool&&tool.posicaoInserto;return Object.hasOwn(tips,position)?tips[position]:(tool&&tool.tipo==='interna'?2:3);}
 function slotSetup(form,type,slot,index,tool){return Object.assign({position:String(index+1),offset:String(index+1),tip:String(defaultTip(tool))},form.toolSetupByTipo&&form.toolSetupByTipo[type]&&form.toolSetupByTipo[type][slot]||{});}
 function programTool(state,tools,reference){
  if(Object.prototype.hasOwnProperty.call(state.ferr||{},reference.codigo))return tools.find(function(t){return t.id===state.ferr[reference.codigo];});
  var matches=tools.filter(function(t){return t.tipo===(reference.sug&&reference.sug.tipo);});
  return matches.length===1?matches[0]:undefined;
 }
 function programOrientation(state,reference,tool){var allowed=tool&&tool.tipo==='encaixe'?['canal','canalext','canalint']:tool&&tool.tipo==='rosca'?['rosca','roscaint']:[],saved=(state.orient||{})[reference.codigo];return allowed.includes(saved)?saved:allowed.includes(reference.sug&&reference.sug.orient)?reference.sug.orient:allowed[0];}
 function programGeometry(state,tools,reference){
  var tool=programTool(state,tools,reference);if(!tool)return undefined;
  var setup=(state.setup||{})[reference.codigo]||{},copy=Object.assign({},tool);
  if(setup.radius!==''&&setup.radius!=null){var radius=Number(setup.radius);if(!Number.isFinite(radius)||radius<0)throw Error('T'+reference.codigo+': informe raio do corretor válido.');copy.raio=radius;}
  if(['externa','faceamento','interna'].includes(tool.tipo)&&Number(copy.larguraInserto)>0&&Number(copy.raio)>=Number(copy.larguraInserto)/(1+Math.cos((Number(copy.angulo)||80)*Math.PI/180)))throw Error('T'+reference.codigo+': o raio do corretor não cabe na largura e no ângulo do inserto.');
  if(setup.tip!==''&&setup.tip!=null){copy.tip=Number(setup.tip);if(!Number.isInteger(copy.tip)||copy.tip<1||copy.tip>9)throw Error('T'+reference.codigo+': informe ponta do corretor de 1 a 9.');}
  else if(['externa','faceamento','interna'].includes(tool.tipo))copy.tip=defaultTip(tool);
  copy.t=reference.codigo;
  return copy;
 }
 return {splitCode:splitCode,composeCode:composeCode,slotSetup:slotSetup,defaultTip:defaultTip,programTool:programTool,programOrientation:programOrientation,programGeometry:programGeometry};
});
