export const MODULES = [['gerador','Gerador'],['desenho','Desenho da peça'],['pdf','Importar PDF'],['cad','Editor CAD DXF'],['ferr','Ferramentas'],['sim','Simulação'],['cfg','Configurações'],['dados','Dados e backup']];
export const DEFAULT_USERS = [
  {username:'admin',hash:'cd277c6bbef2c4f0094273a47b6f5109a25786c48978050ec42399603a67ec93',views:MODULES.map(([id])=>id)},
  {username:'simu',hash:'b0666239cc2df84b48f66edb2c736a0b5ad9fcc10b6a7f465cd37f18147c6792',views:['sim','ferr','dados']},
  {username:'desenho',hash:'728ea43ffbe016e94cea7770d2f2067c1321f5ea9c9bf5cb2e240b08bebf6956',views:['desenho','pdf','cad','dados']}
].map(u=>({...u,scheme:'legacy',limitSeconds:null,usedSeconds:0}));
export const normalizeUsername = name => String(name||'').trim().toLowerCase();
export const exhausted = user => user?.limitSeconds!=null && user.usedSeconds>=user.limitSeconds;
export function publicUser(user){const {username,views,limitSeconds,usedSeconds}=user;return {username,views,limitSeconds,usedSeconds};}
export function formatDuration(seconds=0){const n=Math.max(0,Math.floor(seconds));return [Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(x=>String(x).padStart(2,'0')).join(':');}
export function validateUser(input,existing){
  const username=normalizeUsername(input.username);
  if(!/^[a-z0-9._-]{1,40}$/.test(username))throw Error('Use até 40 letras sem acento, números, ponto, hífen ou sublinhado no usuário.');
  const password=String(input.password||'');
  if((!existing||password)&& (password.length<4||password.length>256))throw Error('A senha deve ter de 4 a 256 caracteres.');
  const views=MODULES.map(([id])=>id).filter(id=>input.views?.includes(id));
  if(!views.length&&username!=='admin')throw Error('Selecione pelo menos um módulo.');
  const limitSeconds=input.limitSeconds==null?null:Number(input.limitSeconds);
  if(limitSeconds!=null&&(!Number.isFinite(limitSeconds)||limitSeconds<=0||limitSeconds>315360000))throw Error('Informe um limite maior que zero, de até 5.256.000 minutos.');
  return {username,password,views:username==='admin'?MODULES.map(([id])=>id):views,limitSeconds:username==='admin'?null:limitSeconds};
}
const hex=bytes=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function passwordHash(password,user){
  if(user.scheme==='legacy')return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('alumasa-cnc:'+password)));
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:Uint8Array.from(user.salt.match(/../g),s=>parseInt(s,16)),iterations:210000},key,256));
}
export async function newPassword(password){const credential={scheme:'pbkdf2',salt:hex(crypto.getRandomValues(new Uint8Array(16)))};return {...credential,hash:await passwordHash(password,credential)};}
// Standalone browser fallback. In the lightweight app, PowerShell owns this registry.
const USERS_KEY='cnc.access.users.v1',SESSIONS_KEY='cnc.access.sessions.v1';
function browserStore(){const raw=localStorage.getItem(USERS_KEY);return raw?JSON.parse(raw):{version:1,users:structuredClone(DEFAULT_USERS)};}
function browserSessions(){return JSON.parse(localStorage.getItem(SESSIONS_KEY)||'{"sessions":{},"ticks":{}}');}
function commitStore(store,runtime){localStorage.setItem(USERS_KEY,JSON.stringify(store));localStorage.setItem(SESSIONS_KEY,JSON.stringify(runtime));}
function meter(store,runtime,username,now){
  const active=Object.values(runtime.sessions).some(s=>s.username===username&&now-s.lastSeen<=90000),account=store.users.find(u=>u.username===username);
  if(active&&account&&runtime.ticks[username]!=null){const elapsed=Math.max(0,Math.min(90000,now-runtime.ticks[username]))/1000;account.usedSeconds+=elapsed;if(account.limitSeconds!=null)account.usedSeconds=Math.min(account.usedSeconds,account.limitSeconds);}
  runtime.ticks[username]=now;
}
async function browserAccess(action,data,session){
  const store=browserStore(),runtime=browserSessions(),now=Date.now();
  if(action==='login'){
    const username=normalizeUsername(data.username),account=store.users.find(u=>u.username===username);
    if(!account||await passwordHash(data.password,account)!==account.hash)throw Error('Usuário ou senha incorretos.');
    meter(store,runtime,username,now);
    if(exhausted(account)){commitStore(store,runtime);throw Error('Tempo de uso esgotado. Solicite um ajuste ao administrador.');}
    const id=crypto.randomUUID();runtime.sessions[id]={username,lastSeen:now};commitStore(store,runtime);return {session:id,user:publicUser(account)};
  }
  const active=runtime.sessions[session],account=store.users.find(u=>u.username===active?.username);
  if(!account)throw Error('Sessão encerrada. Entre novamente.');
  meter(store,runtime,account.username,now);active.lastSeen=now;
  if(action==='logout'||action==='pause'){if(action==='logout')delete runtime.sessions[session];else active.lastSeen=0;commitStore(store,runtime);return true;}
  if(exhausted(account)){delete runtime.sessions[session];commitStore(store,runtime);throw Error('Tempo de uso esgotado. Solicite um ajuste ao administrador.');}
  if(action==='pulse'){commitStore(store,runtime);return {user:publicUser(account)};}
  if(account.username!=='admin')throw Error('Somente o administrador pode gerenciar usuários.');
  if(action==='users'){commitStore(store,runtime);return store.users.map(publicUser);}
  if(action==='save'){
    const existing=store.users.find(u=>u.username===normalizeUsername(data.username)),input=validateUser(data,existing);
    if(data.create&&existing)throw Error('Este usuário já está cadastrado.');
    if(!data.create&&!existing)throw Error('Usuário não encontrado.');
    const next={...existing,...input,usedSeconds:existing?.usedSeconds||0};delete next.password;
    if(input.password)Object.assign(next,await newPassword(input.password));
    if(data.resetUsage)next.usedSeconds=0;
    if(existing)store.users=store.users.map(u=>u.username===next.username?next:u);else store.users.push(next);
    commitStore(store,runtime);return store.users.map(publicUser);
  }
  throw Error('Operação de usuários desconhecida.');
}
export function access(action,data={},session='',keepalive=false){return globalThis.desktop?.access?globalThis.desktop.access(action,data,session,keepalive):browserAccess(action,data,session);}
