import 'server-only';
import {cookies} from 'next/headers';
export const adminCookie='petro_admin';
export function allowedAdmin(email:string){return (process.env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase())}
export async function adminUser(){const token=(await cookies()).get(adminCookie)?.value;if(!token||!process.env.SUPABASE_URL||!process.env.SUPABASE_PUBLISHABLE_KEY)return null;try{const r=await fetch(process.env.SUPABASE_URL+'/auth/v1/user',{headers:{apikey:process.env.SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return null;const user=await r.json();return user.email&&allowedAdmin(user.email)?{userId:user.id,email:user.email}:null}catch{return null}}
