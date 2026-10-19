async function workspaceClient(url,{username='admin',password='admin'}={}){
 const base=new URL(url),token=base.searchParams.get('token');let session='',revision='';
 async function raw(route,data,extra={}){const response=await fetch(base.origin+'/api/'+route,{method:data===undefined?'GET':'POST',headers:{'X-CNC-Token':token,'X-CNC-Session':session,'If-Match':revision,'Content-Type':'application/json',...extra},...(data===undefined?{}:{body:JSON.stringify(data)})});if(response.ok&&response.headers.get('ETag'))revision=response.headers.get('ETag');return response}
 async function call(route,data,extra){const response=await raw(route,data,extra);if(!response.ok){const error=new Error(await response.text());error.status=response.status;throw error}return response.json()}
 const logged=await call('access/login',{username,password});session=logged.session;
 return {raw,call,load:()=>call('load'),save:data=>call('save',data),get session(){return session},get revision(){return revision},base,token};
}
// Apenas preparacao/restauracao deliberada de fixtures pelo administrador dos testes.
// Os testes de conflito usam workspaceClient diretamente, sem renovar a revisao.
async function fixtureApi(url){const client=await workspaceClient(url);return async(route,data)=>{if(route==='save')await client.load();return client.call(route,data)}}
module.exports={workspaceClient,fixtureApi};
