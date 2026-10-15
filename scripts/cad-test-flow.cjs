// Cada ação de um teste legado navega pela aba visível antes de usar o controle.
// Não escreve estado do editor nem dispara os handlers de navegação diretamente.
function wrap(page,locator){return new Proxy(locator,{get(target,name){
 if(name==='constructor')return target.constructor;
 if(['click','fill','check','uncheck','selectOption','setInputFiles','dispatchEvent','screenshot','scrollIntoViewIfNeeded'].includes(name))return async(...args)=>{
  const step=await target.evaluate(el=>el.closest('[data-dxf-step]')?.hidden?Number(el.closest('[data-dxf-step]').dataset.dxfStep):0);
  if(step)await page.locator('.dxf-steps [data-dxf-go="'+step+'"]').click();
  const closed=await target.evaluate(el=>!!el.closest('details:not([open])'));if(closed)await page.locator('.dxf-drafts summary').click();
  return target[name](...args);
 };
 if(['filter','first','last','nth','locator'].includes(name))return(...args)=>wrap(page,target[name](...args));
 const value=Reflect.get(target,name,target);return typeof value==='function'?value.bind(target):value;
}})}
function cadControl(page,selector){return wrap(page,page.locator(selector))}
async function selectCadMode(page,value){const button=cadControl(page,'[data-dxf-mode="'+value+'"]');if(await button.getAttribute('aria-pressed')!=='true')await button.click()}
module.exports={cadControl,selectCadMode};
