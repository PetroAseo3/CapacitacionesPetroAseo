import {json} from '@/lib/portal';
export const dynamic='force-dynamic';
export async function GET(){return json({error:'Recarga la página para entrar al portal de capacitaciones.'},409)}
export async function POST(){return json({error:'El sistema se actualizó. Recarga la página e ingresa nuevamente con tu documento.'},409)}
