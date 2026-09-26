import type { CommandEnvelope, Snapshot } from '../shared/types';
let csrf='';
export class ApiError extends Error {constructor(message:string,public status:number,public code?:string){super(message);}}
export async function api<T>(path:string,body?:unknown):Promise<T>{
  let response:Response;
  try {response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new ApiError('Connection lost. Your information has not been saved on this device.',0);}
  const result=await response.json().catch(()=>({error:{message:'The server returned an unreadable response.'}}));
  if(!response.ok)throw new ApiError(typeof result.error==='string'?result.error:result.error?.message??result.message??'Unable to complete this request.',response.status,result.code??result.error?.code);
  return result as T;
}
export async function session(){const s=await api<{authenticated:boolean;csrfToken:string}>('/api/session');csrf=s.csrfToken;return s;}
export async function login(password:string){await session();await api('/api/login',{password});return session();}
export async function logout(){await api('/api/logout',{});csrf='';}
export async function snapshot(){return api<Snapshot>('/api/snapshot');}
export async function mutate(envelope:CommandEnvelope){return api<{snapshot:Snapshot}>('/api/commands',envelope);}
