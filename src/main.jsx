import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';
class Boundary extends React.Component {constructor(props){super(props);this.state={error:null}}static getDerivedStateFromError(error){return {error}}render(){return this.state.error?<main className="startup"><h1>A tela encontrou um erro</h1><p>{this.state.error.message}</p><p>Os dados salvos continuam preservados. Reabra o aplicativo e exporte um backup.</p><button onClick={()=>location.reload()}>Reabrir tela</button></main>:this.props.children}}
createRoot(document.getElementById('root')).render(<Boundary><App/></Boundary>);
