const {app,BrowserWindow,ipcMain,protocol,net}=require('electron');
const fs=require('node:fs/promises'),path=require('node:path'),{pathToFileURL}=require('node:url');
app.setName('CNC Torno React');
if(process.argv.includes('--ui-test'))app.setPath('userData',path.join(app.getPath('temp'),'cnc-react-ui-test-'+process.pid));
protocol.registerSchemesAsPrivileged([{scheme:'app',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
let queue=Promise.resolve(),expected=null,loaded=false;
const dataFile=()=>path.join(app.getPath('userData'),'workspace.json');
app.whenReady().then(async()=>{
 const root=path.join(__dirname,'../dist');
 protocol.handle('app',request=>{const url=new URL(request.url);const target=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(url.host!=='cnc'||!target.startsWith(root+path.sep))return new Response('Forbidden',{status:403});return net.fetch(pathToFileURL(target).href)});
 const trusted=event=>{if(!event.senderFrame?.url.startsWith('app://cnc/'))throw new Error('Origem não autorizada')};
 ipcMain.handle('workspace:load',async event=>{trusted(event);try{const raw=await fs.readFile(dataFile(),'utf8'),data=JSON.parse(raw);if(data.format!=='cnc-workspace'||!Array.isArray(data.tools)||!Array.isArray(data.drawings))throw new Error('Formato de dados inválido');if(!loaded){expected=raw;loaded=true}return data}catch(e){if(e.code==='ENOENT'){loaded=true;return null}throw e}});
 ipcMain.handle('workspace:path',event=>{trusted(event);return app.getPath('userData')});
 ipcMain.handle('workspace:save',(event,data)=>{trusted(event);if(data?.format!=='cnc-workspace'||!Array.isArray(data.tools)||!Array.isArray(data.drawings))throw new Error('Dados inválidos');const text=JSON.stringify(data);if(text.length>30*1024*1024)throw new Error('Backup excede 30 MB');const operation=queue.catch(()=>{}).then(async()=>{const file=dataFile();await fs.mkdir(path.dirname(file),{recursive:true});let disk=null;try{disk=await fs.readFile(file,'utf8')}catch(e){if(e.code!=='ENOENT')throw e}if(disk!==expected)throw new Error('Outro aplicativo alterou os dados. Exporte esta sessão e reabra para evitar sobrescrever.');try{await fs.copyFile(file,file+'.previous')}catch(e){if(e.code!=='ENOENT')throw e}await fs.writeFile(file+'.tmp',text,'utf8');await fs.rename(file+'.tmp',file);expected=text;return true});queue=operation;return operation});
 const smoke=process.argv.includes('--smoke-test');
 const win=new BrowserWindow({width:1440,height:960,minWidth:900,minHeight:650,show:!smoke&&!process.argv.includes('--ui-test'),autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('app://cnc/'))event.preventDefault()});
 win.webContents.on('did-fail-load',(_,code,description)=>{console.error(code,description);if(smoke)app.exit(1)});
 await win.loadURL('app://cnc/index.html');
 if(smoke){await new Promise(r=>setTimeout(r,2000));const result=await win.webContents.executeJavaScript('({title:document.title,text:document.body.innerText,engine:!!globalThis.CNC,desktop:!!globalThis.desktop})');console.log(JSON.stringify(result));app.exit(result.engine&&result.desktop&&result.text.includes('Entrar')?0:1)}
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',event=>{if(queue){event.preventDefault();const pending=queue;queue=null;pending.finally(()=>app.quit())}});
