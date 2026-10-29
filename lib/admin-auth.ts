import {getChatGPTUser} from '@/app/chatgpt-auth';
import {config} from './portal';
export async function adminUser(){const user=await getChatGPTUser();if(!user)return null;const allowed=String(config().ADMIN_EMAILS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);return allowed.includes(user.email.toLowerCase())?user:null}
