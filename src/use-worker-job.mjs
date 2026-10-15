import {useCallback,useEffect,useRef,useState} from 'react';
export default function useWorkerJob(kind,input,delay=120){
 const [state,setState]=useState({input:null,busy:false}),worker=useRef(null),framePending=useRef(false),latestSeek=useRef(null);
 useEffect(()=>{
  if(!input){setState({input,busy:false});return;}
  let active=true,current;
  setState({input,busy:true,status:'Preparando leitura…'});
  const timer=setTimeout(()=>{
   try{
    current=new Worker(new URL('./engine/simulation-worker.js',document.baseURI));worker.current=current;
    current.onmessage=({data})=>{if(!active)return;if(data.status)setState(s=>({...s,status:data.status}));else {setState(s=>({...s,input,busy:false,...data}));if(data.frame){framePending.current=false;const time=latestSeek.current;latestSeek.current=null;if(time!=null&&time!==data.frame.time){framePending.current=true;current.postMessage({kind:'seek',time});}}}};
    current.onerror=event=>{if(active)setState({input,busy:false,error:'Não foi possível preparar a simulação: '+event.message});};
    current.postMessage({kind,input});
   }catch(error){if(active)setState({input,busy:false,error:error.message});}
  },delay);
  return()=>{active=false;clearTimeout(timer);current?.terminate();if(worker.current===current)worker.current=null;framePending.current=false;latestSeek.current=null;};
 },[kind,input,delay]);
 const seek=useCallback(time=>{if(!worker.current)return;if(framePending.current){latestSeek.current=time;return;}framePending.current=true;worker.current.postMessage({kind:'seek',time});},[]);
 return {...(state.input===input?state:{input,busy:!!input,status:'Atualizando leitura…'}),seek};
}
