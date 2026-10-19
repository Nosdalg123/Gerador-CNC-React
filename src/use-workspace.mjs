import {useEffect,useRef,useState} from 'react';
import {initialWorkspace,saveBrowser} from './data.mjs';
export default function useWorkspace(account,session,onSessionError){
 const [workspace,setWorkspace]=useState(null),[saved,setSaved]=useState('Carregando dados…'),[fatal,setFatal]=useState(''),[saveError,setSaveError]=useState(''),[conflict,setConflict]=useState(false),[recovery,setRecovery]=useState(null),[reloadKey,setReloadKey]=useState(0);
 const current=useRef(null),persisted=useRef(null),loaded=useRef(''),generation=useRef(0),queue=useRef(Promise.resolve()),blocked=useRef(null),sessionError=useRef(onSessionError);sessionError.current=onSessionError;
 useEffect(()=>{
  let active=true;const turn=++generation.current;loaded.current='';setFatal('');setSaveError('');setConflict(false);
  if(!account){if(current.current&&current.current!==persisted.current)setRecovery(current.current);setWorkspace(null);return;}
  async function load(){try{
   await queue.current;const data=await globalThis.desktop?.loadWorkspace();const next=data||initialWorkspace(globalThis.CNC,globalThis.CNC_SEED_TOOLS,localStorage);
   if(!active)return;
   if(!globalThis.desktop&&!localStorage.getItem('cnc.react.workspace.v3'))saveBrowser(localStorage,next);
   loaded.current=session;blocked.current=null;persisted.current=data||!globalThis.desktop?next:null;current.current=next;setWorkspace(next);setSaved('Dados salvos neste dispositivo');
  }catch(error){if(active){if(error.status===401)sessionError.current(error.message);else setFatal('Não foi possível carregar os dados existentes: '+error.message)}}}
  load();return()=>{active=false;if(generation.current===turn)loaded.current=''};
 },[account?.username,session,reloadKey]);
 useEffect(()=>{
  if(!account||!workspace||loaded.current!==session||workspace===persisted.current)return;
  const turn=generation.current,snapshot=workspace;current.current=snapshot;setSaved('Salvando…');
  queue.current=queue.current.then(async()=>{
   if(turn!==generation.current)return;
   try{
    if(blocked.current)throw blocked.current;
    if(globalThis.desktop)await globalThis.desktop.saveWorkspace(snapshot);else saveBrowser(localStorage,snapshot);
    if(turn===generation.current){persisted.current=snapshot;if(current.current===snapshot){setSaved('Dados salvos neste dispositivo');setSaveError('')}}
   }catch(error){if(turn===generation.current){blocked.current=error;setSaved('Falha ao salvar — exporte um backup');setSaveError(error.message);setConflict(error.status===409)}}
  });
 },[workspace,account?.username,session]);
 useEffect(()=>{const warn=e=>{if(current.current&&current.current!==persisted.current){e.preventDefault();e.returnValue='Há alterações não salvas. Exporte uma cópia antes de fechar.'}};addEventListener('beforeunload',warn);return()=>removeEventListener('beforeunload',warn)},[]);
 const update=fn=>setWorkspace(previous=>{const next=fn(previous);current.current=next;return next});
 const reload=()=>{if(current.current&&current.current!==persisted.current)setRecovery(current.current);setWorkspace(null);setReloadKey(n=>n+1)};
 const flush=async()=>{await queue.current;if(blocked.current)throw blocked.current;setRecovery(null)};
 return {workspace,update,saved,fatal,saveError,conflict,reload,flush,recovery};
}
