// O marcador e substituido somente pelo servidor que entrega esta bridge.
(()=>{
 const token='__CNC_TOKEN__';let userSession='',revision=null,queue=Promise.resolve(),blocked=null,accessGeneration=0;
 async function request(path,data,session='',keepalive=false,extra={}){
  const r=await fetch(path,{method:data===undefined?'GET':'POST',headers:{'X-CNC-Token':token,'X-CNC-Session':session,'Content-Type':'application/json',...extra},keepalive,...(data===undefined?{}:{body:JSON.stringify(data)})});
  if(!r.ok){const error=new Error(await r.text());error.status=r.status;throw error}return {data:await r.json(),revision:r.headers.get('ETag')};
 }
 globalThis.desktop={
  loadWorkspace:async()=>{await queue;const result=await request('/api/load',undefined,userSession);revision=result.revision;blocked=null;return result.data},
  saveWorkspace:data=>{const session=userSession;const save=queue.then(async()=>{if(blocked)throw blocked;try{const result=await request('/api/save',data,session,false,{'If-Match':revision||''});revision=result.revision;return result.data}catch(error){blocked=error;throw error}});queue=save.catch(()=>{});return save},
  dataPath:async()=>(await request('/api/path',undefined,userSession)).data,
  access:async(action,data,session,keepalive)=>{const generation=action==='login'||action==='logout'?++accessGeneration:accessGeneration;const result=(await request('/api/access/'+action,data,session,keepalive)).data;if(generation===accessGeneration){if(action==='login')userSession=result.session;else if(action==='pulse'&&(!userSession||userSession===session))userSession=session;else if(action==='logout'&&userSession===session)userSession=''}return result}
 };
 setInterval(()=>request('/api/alive').catch(()=>{}),15000);
})();
