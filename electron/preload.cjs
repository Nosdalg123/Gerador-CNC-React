const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop',{loadWorkspace:()=>ipcRenderer.invoke('workspace:load'),saveWorkspace:data=>ipcRenderer.invoke('workspace:save',data),dataPath:()=>ipcRenderer.invoke('workspace:path')});
