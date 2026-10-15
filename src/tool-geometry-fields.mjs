export const MOUNT_POSITIONS=[['auto','Padrão do tipo'],['inferior_esquerdo','Inferior esquerdo'],['inferior_direito','Inferior direito'],['superior_esquerdo','Superior esquerdo'],['superior_direito','Superior direito']];
export const GEOMETRY_FIELDS={raio:{label:'Raio de ponta · mm',min:0},angulo:{label:'Ângulo da pastilha · °',min:1,max:179},apSuporte:{label:'Ângulo do suporte κ · °',min:1,max:179},largura:{label:'Largura de corte / canal · mm',min:.01},larguraInserto:{label:'Largura do inserto · mm',min:.01,hint:'Pastilha rômbica: diâmetro do círculo inscrito (IC). Rosca: largura total da base do inserto.'},comprimentoInserto:{label:'Comprimento do inserto · mm',min:.01,hint:'Profundidade do inserto atrás da aresta de corte; a largura do canal é definida separadamente.'},espessuraHaste:{label:'Espessura / Ø da haste · mm',min:.01,hint:'Espessura da haste no plano XZ. Para a broca, informe o diâmetro da haste.'},diametro:{label:'Ø da broca · mm',min:.01}};
export const GROOVE_PROFILES=[['reto','Reto'],['raio','Raio nas quinas'],['total','Raio total']];
export const INSERT_SEATS=[['auto','Padrão do suporte'],['centro','Centro'],['esquerda','Esquerda'],['direita','Direita']];
export const HOLDER_ORIENTATIONS=[['auto','Padrão atual'],['horizontal','Horizontal'],['vertical','Vertical']];
GEOMETRY_FIELDS.raioCorte={label:'Raio do perfil de corte · mm',min:0,hint:'Arredonda as duas quinas da aresta. O limite é metade da largura de corte.'};
export function geometryKeys(type){return type==='furacao'?['diametro','espessuraHaste']:['encaixe','bedame'].includes(type)?['largura','comprimentoInserto','espessuraHaste','apSuporte']:type==='rosca'?['angulo','larguraInserto','espessuraHaste','apSuporte']:['raio','angulo','larguraInserto','espessuraHaste','apSuporte'];}
export function validateToolGeometry(tool){
 if(tool.tPadrao!=null&&tool.tPadrao!==''&&(!/^[0-9]{4}$/.test(String(tool.tPadrao))||Number(String(tool.tPadrao).slice(0,2))<1||Number(String(tool.tPadrao).slice(2))<1))return 'Informe o número padrão com quatro dígitos, posição e corretor de 01 a 99 (ex.: 0404).';
 if(tool.assentoInserto&&!INSERT_SEATS.some(([id])=>id===tool.assentoInserto))return 'Selecione centro, esquerda ou direita para o inserto no suporte.';
 if(tool.orientacaoSuporte&&!HOLDER_ORIENTATIONS.some(([id])=>id===tool.orientacaoSuporte))return 'Selecione uma orientação válida do suporte.';
 for(const key of tool.tipo?geometryKeys(tool.tipo):Object.keys(GEOMETRY_FIELDS)){const field=GEOMETRY_FIELDS[key];if(tool[key]==null||tool[key]==='')continue;const value=Number(tool[key]);if(!Number.isFinite(value)||value<field.min||(field.max!=null&&value>field.max))return 'Confira '+field.label.toLowerCase()+'.';}
 if(tool.posicaoInserto&&!MOUNT_POSITIONS.some(([id])=>id===tool.posicaoInserto))return 'Selecione uma posição válida do inserto.';
 if(['encaixe','bedame'].includes(tool.tipo)){
  if(tool.perfilCorte&&!GROOVE_PROFILES.some(([id])=>id===tool.perfilCorte))return 'Selecione um perfil de corte válido.';
  const width=Number(tool.largura)||4.5,radius=tool.perfilCorte==='total'?width/2:tool.perfilCorte==='raio'?Number(tool.raioCorte):0,length=Number(tool.comprimentoInserto)||({canal:12,canalint:8,canalext:14}[tool.orient]||(tool.tipo==='bedame'?14:12));
  if(tool.perfilCorte==='raio'&&!(radius>0))return 'Informe um raio do perfil de corte maior que zero.';
  if(!Number.isFinite(radius)||radius>width/2||radius>length)return 'O raio do perfil de corte deve caber em metade da largura e no comprimento do inserto.';
 }
 if(!['furacao','rosca','encaixe','bedame'].includes(tool.tipo)&&Number(tool.larguraInserto)>0&&Number(tool.raio)>=Number(tool.larguraInserto)/(1+Math.cos((Number(tool.angulo)||80)*Math.PI/180)))return 'O raio de ponta não cabe na largura e no ângulo do inserto.';
 return '';
}
