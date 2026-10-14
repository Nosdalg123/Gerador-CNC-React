const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../src/users.mjs');
test('cadastro preserva os usuários antigos e bloqueia configurações inválidas',async()=>{
 const {DEFAULT_USERS,validateUser,MODULES}=await load();assert.deepEqual(DEFAULT_USERS.map(u=>u.username),['admin','simu','desenho']);assert.ok(DEFAULT_USERS.every(u=>u.limitSeconds===null));
 assert.throws(()=>validateUser({username:'operador',password:'teste',views:[]}),/módulo/);
 for(const limitSeconds of [0,-1,Infinity,NaN])assert.throws(()=>validateUser({username:'operador',password:'teste',views:['sim'],limitSeconds}),/limite/);
 assert.throws(()=>validateUser({username:'<script>',password:'teste',views:['sim']}),/letras/);
 const admin=validateUser({username:'ADMIN',views:[],limitSeconds:1},DEFAULT_USERS[0]);assert.equal(admin.limitSeconds,null);assert.deepEqual(admin.views,MODULES.map(([id])=>id));
});
test('senha nova tem salt exclusivo e não é gravada em texto; legado continua válido',async()=>{
 const {newPassword,passwordHash,DEFAULT_USERS}=await load();const a=await newPassword('teste123'),b=await newPassword('teste123');assert.notEqual(a.salt,b.salt);assert.notEqual(a.hash,b.hash);assert.equal(a.hash,await passwordHash('teste123',a));assert.notEqual(a.hash,await passwordHash('errada',a));assert.equal(await passwordHash('admin',DEFAULT_USERS[0]),DEFAULT_USERS[0].hash);
});
test('tempo e limite distinguem ilimitado de esgotado e mostram horas acumuladas',async()=>{
 const {exhausted,formatDuration}=await load();assert.equal(exhausted({usedSeconds:100,limitSeconds:null}),false);assert.equal(exhausted({usedSeconds:60,limitSeconds:60}),true);assert.equal(exhausted({usedSeconds:59,limitSeconds:60}),false);assert.equal(formatDuration(90061),'25:01:01');
});
test('navegador isolado mantém cadastro separado, limita acesso e soma sessões sem duplicar tempo',async()=>{
 const {access}=await load(),values=new Map(),originalStorage=globalThis.localStorage,originalNow=Date.now;let now=100000;
 globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};Date.now=()=>now;
 try{
  const admin=await access('login',{username:'admin',password:'admin'});
  await access('save',{username:'operador',password:'teste123',views:['sim'],limitSeconds:4,create:true},admin.session);
  const first=await access('login',{username:'operador',password:'teste123'});
  await assert.rejects(access('users',{},first.session),/administrador/);
  now+=1000;assert.equal((await access('pulse',{},first.session)).user.usedSeconds,1);
  await access('logout',{},first.session);now+=20000;
  const second=await access('login',{username:'operador',password:'teste123'});assert.equal(second.user.usedSeconds,1);
  const third=await access('login',{username:'operador',password:'teste123'});now+=1000;
  assert.equal((await access('pulse',{},second.session)).user.usedSeconds,2);assert.equal((await access('pulse',{},third.session)).user.usedSeconds,2);
  await access('pause',{},second.session);await access('logout',{},third.session);now+=20000;
  assert.equal((await access('pulse',{},second.session)).user.usedSeconds,2);
  now+=2000;await assert.rejects(access('pulse',{},second.session),/esgotado/);await assert.rejects(access('login',{username:'operador',password:'teste123'}),/esgotado/);
  const listed=await access('users',{},admin.session);assert.ok(listed.every(u=>!u.hash&&!u.salt));assert.equal(values.has('cnc.react.workspace.v3'),false);
 }finally{Date.now=originalNow;globalThis.localStorage=originalStorage;}
});
