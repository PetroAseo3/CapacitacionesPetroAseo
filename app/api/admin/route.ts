import {select,rpc} from '@/lib/supabase';
import {adminUser} from '@/lib/admin-auth';
import {json,allTrainings,getTraining,normalize,sameOrigin,availability} from '@/lib/portal';
export const dynamic='force-dynamic';
export async function GET(req:Request){if(!await adminUser())return json({error:'Acceso reservado a la administración.'},403);try{const id=new URL(req.url).searchParams.get('training');const rows=id?await select('attempts',{select:'name,score,total,date,training_revision',training_id:'eq.'+id,order:'date.desc',limit:'200'}):null;return json({trainings:(await allTrainings()).map(t=>({...t,status:availability(t)})),results:rows||[]})}catch{return json({error:'No se pudo cargar la administración.'},500)}}
export async function POST(req:Request){if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);if(!await adminUser())return json({error:'Acceso reservado a la administración.'},403);try{const raw=await req.text();if(raw.length>250000)return json({error:'Contenido demasiado grande.'},413);const body=JSON.parse(raw);let t;try{t=normalize(body.training)}catch(e){return json({error:e instanceof Error?e.message:'Revisa los datos.'},400)}
const existing=await getTraining(t.id),expected=existing?.revision||0;if(body.expectedRevision!==expected)return json({error:'Otra sesión modificó esta capacitación. Vuelve a abrirla antes de guardar.'},409);
const revision=expected+1,updatedAt=new Date().toISOString();
const saved=await rpc('petro_save_training',{p_expected:expected,p_training:{id:t.id,title:t.title,description:t.description,videos:JSON.stringify(t.videos),questions:JSON.stringify(t.questions),published:t.published?1:0,starts_at:t.startsAt,ends_at:t.endsAt,revision,updated_at:updatedAt}});
if(!saved)return json({error:'Otra sesión modificó esta capacitación. Vuelve a abrirla.'},409);return json({training:{...t,revision,updatedAt,status:availability({...t,revision,updatedAt})}});
}catch{return json({error:'No se pudo guardar. Intenta nuevamente.'},500)}}
