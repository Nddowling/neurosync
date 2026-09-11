import { createContext, useState, useContext, useEffect } from 'react';
import { neurosync, RequestError } from '@/api/client';

/** @type {import('react').Context<{user: import('@/api/client').Profile|null,isAuthenticated:boolean,isLoadingAuth:boolean,isLoadingPublicSettings:boolean,authError:{type:string,message:string}|null,logout:()=>Promise<void>,navigateToLogin:()=>void,checkAppState:()=>Promise<void>}|null>} */
const AuthContext = createContext(null);
export const AuthProvider = ({children}) => {
 const [user,setUser]=useState(null);
 const [isLoadingAuth,setLoading]=useState(true);
 const [authError,setError]=useState(null);
 const checkAppState=async()=>{
  setLoading(true);setError(null);
  try {setUser(await neurosync.auth.me());}
  catch(error){setUser(null);setError({type:error instanceof RequestError&&error.status===401?'auth_required':'unavailable',message:'Unable to load your session.'});}
  finally {setLoading(false);}
 };
 useEffect(()=>{void checkAppState();},[]);
 return <AuthContext.Provider value={{user,isAuthenticated:!!user,isLoadingAuth,isLoadingPublicSettings:false,authError,logout:neurosync.auth.logout,navigateToLogin:neurosync.auth.redirectToLogin,checkAppState}}>{children}</AuthContext.Provider>;
};
export const useAuth=()=>{const context=useContext(AuthContext);if(!context)throw new Error('AuthProvider required');return context;};
