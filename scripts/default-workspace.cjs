const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{pathToFileURL}=require('node:url');
async function writeDefaultWorkspace(root,out){
 const CNC=require(path.join(root,'public/engine/core.js')),context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'public/engine/seed.js'),'utf8'),context);
 const {initialWorkspace}=await import(pathToFileURL(path.join(root,'src/data.mjs')));
 const data=initialWorkspace(CNC,JSON.parse(JSON.stringify(context.window.CNC_SEED_TOOLS)),{getItem:()=>null,length:0});
 fs.writeFileSync(path.join(out,'DEFAULT-WORKSPACE.json'),JSON.stringify(data)+'\n');
}
module.exports={writeDefaultWorkspace};
