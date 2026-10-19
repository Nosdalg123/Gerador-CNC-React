export const KEYS = { cadDrafts:'cnc_dxf_rascunhos_v1', tools:'cnc.tools.v1', drawings:'cnc.desenhos.v1', work:'cnc.desenho.work.v1', form:'cnc.form.v2', program:'cnc.progsim.v1', theme:'cnc.theme.v2', seeded:'cnc.seeded.v1' };
export const clone = value => JSON.parse(JSON.stringify(value));
export const uid = prefix => prefix + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36)+Math.random().toString(36).slice(2));
export function normalizeDrawing(d,CNC) {
  const copy=clone(d);copy.lados=String(copy.lados)==='2'?'2':'1';
  for(const key of ['trechos1','trechos2','internos1','internos2']) { copy[key]=Array.isArray(copy[key])?copy[key]:[]; CNC?.psMigra(copy[key],key.startsWith('internos')); }
  return copy;
}
export function emptyDrawing() { return {id:uid('d'),nome:'',lados:'1',lPeca:100,dRef:'',trechos1:[],trechos2:[],internos1:[],internos2:[]}; }
export function initialWorkspace(CNC,seeds,storage) {
  const read=(key,fallback)=>{try {const raw=storage?.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}};
  const existing=read('cnc.react.workspace.v3',null);
  if(existing?.format==='cnc-workspace'&&Array.isArray(existing.tools)&&Array.isArray(existing.drawings))return existing;
  let tools=read(KEYS.tools,[]);if(!Array.isArray(tools))tools=[];
  const seedValue=read(KEYS.seeded,[]),seeded=Array.isArray(seedValue)?seedValue:[];
  for(const seed of seeds) if(!tools.some(t=>t.seedKey===seed.seedKey)&&!seeded.includes(seed.seedKey))tools.push({...clone(seed),id:uid('t')});
  const form=read(KEYS.form,{});form.maq={...CNC.DEFAULT_MAQ,...form.maq};form.vals ||= {};form.toolByTipo ||= {};form.over ||= {};
  let drawings=read(KEYS.drawings,null);
  if(!Array.isArray(drawings)) { const def=CNC.GERADORES.peca_simples.campos.find(c=>c.id==='trechos1').def;const legacy=form.vals.peca_simples;
    drawings=[normalizeDrawing({...emptyDrawing(),nome:legacy?.trechos1?'Peça simples · dados anteriores':'Exemplo · eixo escalonado',trechos1:clone(def),...(legacy||{})},CNC)]; }
  const extras={};if(storage)for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith('cnc.')&&!key.startsWith('cnc.access.')&&!Object.values(KEYS).includes(key))extras[key]=storage.getItem(key);}
  return {format:'cnc-workspace',version:3,cadDrafts:read(KEYS.cadDrafts,[]),tools,drawings:drawings.map(d=>normalizeDrawing(d,CNC)),work:read(KEYS.work,null),form,program:read(KEYS.program,{texto:'',ferr:{},orient:{},b:{}}),theme:read(KEYS.theme,storage?.getItem(KEYS.theme)||'alumasa'),seeded,legacyExtras:extras};
}
export function parseTransfer(value) {
  if(!value||typeof value!=='object')throw new Error('O arquivo não contém dados reconhecidos.');
  if(value.format==='cnc-workspace') {if(!Array.isArray(value.tools)||!Array.isArray(value.drawings))throw new Error('Backup incompleto.');return value;}
  if(value.localStorage&&typeof value.localStorage==='object') {const result={format:'cnc-workspace',version:3,tools:[],drawings:[],legacyExtras:{}};
    for(const [key,raw] of Object.entries(value.localStorage)){const field=Object.keys(KEYS).find(k=>KEYS[k]===key);if(field==='theme'){result.theme=raw;try{result.theme=JSON.parse(raw)}catch{};continue}if(field){try{result[field]=typeof raw==='string'?JSON.parse(raw):raw;}catch{throw new Error('Dado inválido na chave '+key);}}else result.legacyExtras[key]=raw;}
    return result;
  }
  const tools=Array.isArray(value.ferramentas)?value.ferramentas:null,drawings=Array.isArray(value.desenhos)?value.desenhos:null;
  if(tools||drawings)return {tools:tools||[],drawings:drawings||[]};
  if(Array.isArray(value)&&value.length){if(value[0].t)return {tools:value,drawings:[]};if(value[0].trechos1)return {tools:[],drawings:value};}
  throw new Error('Use um backup completo, banco de ferramentas ou lista de desenhos da versão anterior.');
}
export function mergeWorkspace(current,incoming,CNC) {
  const next=clone(current),idMap={tools:{},drawings:{}},draftMap={};
  if(incoming.cadDrafts){
    const drafts=next.cadDrafts||[],seen=new Set(drafts.map(d=>JSON.stringify(d)));
    for(const raw of incoming.cadDrafts){if(seen.has(JSON.stringify(raw)))continue;const d=clone(raw);if(d.id&&drafts.some(old=>old.id===d.id)){const old=d.id;d.id=uid('cad');draftMap[old]=d.id}drafts.push(d);seen.add(JSON.stringify(raw))}
    next.cadDrafts=drafts;
  }
  const remapDraft=item=>{const id=item?.cadOrigem?.draftId;if(draftMap[id])item.cadOrigem.draftId=draftMap[id];return item};
  for(const key of ['tools','drawings'])for(const raw of incoming[key]||[]) {
    if(!raw||typeof raw!=='object')throw new Error('Há registros inválidos em '+key+'.');
    const item=key==='drawings'?remapDraft(normalizeDrawing(raw,CNC)):clone(raw);item.id ||= uid(key==='tools'?'t':'d');
    const existing=next[key].find(x=>x.id===item.id);
    if(existing&&JSON.stringify(existing)===JSON.stringify(item))continue;
    if(existing){const old=item.id;item.id=uid(key==='tools'?'t':'d');idMap[key][old]=item.id;item.nome=(item.nome||'Sem nome')+' (importado)';}
    next[key].push(item);
  }
  if(incoming.form){next.form={...next.form,...clone(incoming.form)};if(Object.hasOwn(incoming.form,'desenhoSel')&&idMap.drawings[next.form.desenhoSel])next.form.desenhoSel=idMap.drawings[next.form.desenhoSel];
    for(const key of ['cadPrimeiro','cadUsinagem'])if(incoming.form[key])next.form[key]={...clone(current.form?.[key]||{}),...Object.fromEntries(Object.entries(incoming.form[key]).map(([id,value])=>[idMap.drawings[id]||id,clone(value)]))};
    if(incoming.form.toolByTipo)for(const selection of Object.values(next.form.toolByTipo))for(const slot of Object.keys(selection))if(idMap.tools[selection[slot]])selection[slot]=idMap.tools[selection[slot]];}
  for(const key of ['work','program','theme','seeded'])if(incoming[key]!=null)next[key]=clone(incoming[key]);
  if(incoming.program?.ferr)for(const code of Object.keys(next.program.ferr))if(idMap.tools[next.program.ferr[code]])next.program.ferr[code]=idMap.tools[next.program.ferr[code]];
  if(next.work){next.work=normalizeDrawing(next.work,CNC);if(incoming.work){remapDraft(next.work);if(idMap.drawings[next.work.id])next.work.id=idMap.drawings[next.work.id];}}
  next.legacyExtras={...next.legacyExtras,...incoming.legacyExtras};return next;
}
export function saveBrowser(storage,data) {
  const text=JSON.stringify(data),previous=storage.getItem('cnc.react.workspace.v3');
  if(previous)storage.setItem('cnc.react.workspace.previous.v3',previous);
  storage.setItem('cnc.react.workspace.v3',text);
  // Chave única é o commit. Exportação da versão nova permite voltar à antiga.
}
export function legacyExport(data){return {localStorage:Object.fromEntries(Object.entries(KEYS).map(([field,key])=>[key,field==='theme'?data[field]:JSON.stringify(data[field])])),exportadoEm:new Date().toISOString(),versao:'3.1.0'};}
