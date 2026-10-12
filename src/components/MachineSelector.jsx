import React,{useEffect,useRef,useState} from 'react';

export default function MachineSelector({workspace,update}) {
  const [open,setOpen]=useState(false),dialog=useRef(null),trigger=useRef(null);
  const command=workspace.form.maq?.comando==='siemens'?'siemens':'fanuc';
  useEffect(()=>{if(open)dialog.current.showModal();},[open]);
  const close=()=>{dialog.current.close();setOpen(false);trigger.current?.focus()};
  const select=value=>{update(w=>({...w,form:{...w.form,maq:{...w.form.maq,comando:value}}}));close()};
  return <><button ref={trigger} className="machine-trigger" onClick={()=>setOpen(true)} aria-haspopup="dialog">Comando: {command==='siemens'?'Siemens':'Fanuc'} <span aria-hidden="true">▾</span></button>
    <dialog ref={dialog} className="modal machine-dialog" aria-labelledby="machine-title" onCancel={e=>{e.preventDefault();close()}}><h2 id="machine-title">Selecionar máquina</h2><p>Identifique o comando da máquina utilizada.</p><div className="machine-options">{[['fanuc','Fanuc'],['siemens','Siemens']].map(([value,label])=><button key={value} className={command===value?'primary':''} aria-pressed={command===value} onClick={()=>select(value)}>{label}{command===value?' · ativo':''}</button>)}</div><p className="muted">Esta seleção identifica a máquina. A geração de programas mantém o formato Fanuc atual; a simulação também lê Siemens em modo ISO.</p><button onClick={close}>Cancelar</button></dialog></>;
}
