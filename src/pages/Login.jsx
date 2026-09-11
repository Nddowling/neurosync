import {useEffect,useState} from 'react';
import {request} from '@/api/client';
export default function Login(){
 const [mode,setMode]=useState('');const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{request('/api/auth/config').then(config=>setMode(config.mode)).catch(()=>setMessage('Sign-in is temporarily unavailable.'));},[]);
 const submit=async(event)=>{event.preventDefault();setBusy(true);setMessage('');try{
  if(mode==='oidc'){window.location.assign('/api/auth/start');return;}
  await request('/api/auth/login','POST',{email,password});
  window.location.assign('/Dashboard');
 }catch{setMessage('Sign-in could not be completed. Please try again.');}finally{setBusy(false);}};
 return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 space-y-5"><h1 className="text-2xl font-bold">Sign in to NeuroSync</h1><p className="text-slate-500">Your clinical workspace.</p>{mode!=='oidc'&&<label className="block text-sm">Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 block w-full border rounded-lg p-3" /></label>}{mode!=='oidc'&&<label className="block text-sm">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full border rounded-lg p-3" /></label>}<button disabled={busy||!mode} className="w-full bg-slate-900 text-white rounded-lg p-3 disabled:opacity-50">{busy?'Signing in…':'Sign in'}</button>{message&&<p role="status" className="text-sm text-slate-600">{message}</p>}</form></main>;
}
