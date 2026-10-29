import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '@/app/chatgpt-auth';
import {adminUser} from '@/lib/admin-auth';
import Admin from './panel';
export const dynamic='force-dynamic';
export default async function AdminPage(){const user=await getChatGPTUser();const admin=await adminUser();return <><header><a href="/" className="logo"><img src="/logo.png" alt="PetroAseo"/></a><a href="/">Portal del personal</a></header>{admin?<Admin email={admin.email}/>:<main className="login"><h1>Administración</h1><p>{user?'Esta cuenta no tiene acceso administrativo. Inicia sesión con la cuenta autorizada.':'Inicia sesión con la cuenta de administración de PetroAseo.'}</p><a className="button" href={user?chatGPTSignOutPath('/admin'):chatGPTSignInPath('/admin')} target="_top">{user?'Cambiar de cuenta':'Acceder con mi cuenta'}</a></main>}</>}
