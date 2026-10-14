import React,{useEffect,useState} from 'react';
import {Card,Field,Messages} from './Common.jsx';
import {access,MODULES,formatDuration,exhausted} from '../users.mjs';
const blank=()=>({username:'',password:'',views:[],unlimited:true,minutes:'',resetUsage:false});
export default function Users({session}){
  const [accounts,setAccounts]=useState([]),[form,setForm]=useState(blank),[editing,setEditing]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;access('users',{},session).then(users=>{if(active)setAccounts(users)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[session]);
  const change=patch=>setForm(f=>({...f,...patch}));
  const edit=user=>{setEditing(true);setForm({...user,password:'',unlimited:user.limitSeconds==null,minutes:user.limitSeconds==null?'':String(user.limitSeconds/60),resetUsage:false});setError('');setMessage('')};
  const admin=form.username==='admin';
  return <Card title="Usuários" className="users-settings"><p>Cadastre usuários e defina os módulos disponíveis. O limite considera o tempo total conectado, somando todas as sessões. Sair interrompe a contagem.</p><Messages errors={error?[error]:[]} warnings={message?[message]:[]}/>
    <div className="table-scroll"><table aria-label="Usuários cadastrados"><thead><tr><th>Usuário</th><th>Módulos permitidos</th><th>Tempo utilizado</th><th>Limite de uso</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{accounts.map(user=><tr key={user.username}><td><b>{user.username}</b>{user.username==='admin'&&<small>Administrador</small>}</td><td>{MODULES.filter(([id])=>user.views.includes(id)).map(([,name])=>name).join(', ')}</td><td>{formatDuration(user.usedSeconds)}</td><td>{user.limitSeconds==null?'Ilimitado':formatDuration(user.limitSeconds)}</td><td>{exhausted(user)?'Tempo esgotado':'Disponível'}</td><td><button type="button" onClick={()=>edit(user)}>Editar {user.username}</button></td></tr>)}</tbody></table></div>
    <form className="user-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{
      if(!form.unlimited&&(form.minutes===''||!Number.isFinite(Number(form.minutes))||Number(form.minutes)<=0))throw Error('Informe um limite de tempo maior que zero.');
      const next=await access('save',{username:form.username,password:form.password,views:form.views,limitSeconds:form.unlimited?null:Number(form.minutes)*60,create:!editing,resetUsage:form.resetUsage},session);
      setAccounts(next);setForm(blank());setEditing(false);setMessage('Usuário salvo. As permissões e o limite também valem nas próximas sessões.');
    }catch(e){setError(e.message)}finally{setBusy(false)}}}>
      <h3>{editing?'Editar usuário':'Cadastrar novo usuário'}</h3><div className="fields"><Field label="Nome de usuário" type="text" value={form.username} onChange={username=>change({username:username.toLowerCase()})} readOnly={editing} required autoComplete="off" maxLength={40}/><Field label={editing?'Nova senha (vazio mantém a atual)':'Senha do novo usuário'} type="password" value={form.password} onChange={password=>change({password})} required={!editing} autoComplete="new-password" minLength={4} maxLength={256}/></div>
      <fieldset className="user-modules"><legend>Módulos permitidos</legend>{MODULES.map(([id,name])=><label className="checkbox" key={id}><input type="checkbox" checked={admin||form.views.includes(id)} disabled={admin} onChange={e=>change({views:e.target.checked?[...form.views,id]:form.views.filter(x=>x!==id)})}/>{name}</label>)}</fieldset>
      <label className="checkbox"><input type="checkbox" checked={admin||form.unlimited} disabled={admin} onChange={e=>change({unlimited:e.target.checked})}/>Uso ilimitado</label>
      {!form.unlimited&&!admin&&<Field label="Limite total de uso (minutos)" value={form.minutes} onChange={minutes=>change({minutes})} min="0.000001" max="5256000" required/>}
      {editing&&!admin&&<label className="checkbox"><input type="checkbox" checked={form.resetUsage} onChange={e=>change({resetUsage:e.target.checked})}/>Zerar tempo utilizado ao salvar</label>}
      {admin&&<p className="note">O administrador mantém acesso a todos os módulos e uso ilimitado para gerenciar o sistema.</p>}
      <div className="toolbar"><button type="submit" className="primary" disabled={busy}>{busy?'Salvando usuário…':editing?'Salvar usuário':'Cadastrar usuário'}</button>{editing&&<button type="button" onClick={()=>{setEditing(false);setForm(blank());setError('');setMessage('')}}>Cancelar edição</button>}</div>
    </form>
  </Card>;
}
