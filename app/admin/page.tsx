import {adminUser} from '@/lib/admin-auth';
import Admin from './panel';
import Login from './login';
export const dynamic='force-dynamic';
export default async function AdminPage(){const admin=await adminUser();return <><header><a href="/" className="logo"><img src="/logo.png" alt="PetroAseo"/></a><a href="/">Portal del personal</a></header>{admin?<Admin email={admin.email}/>:<Login/>}</>}
