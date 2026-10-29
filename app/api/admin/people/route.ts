import {adminUser} from '@/lib/admin-auth';
import {select,upsert} from '@/lib/supabase';
import {json,sameOrigin,allTrainings} from '@/lib/portal';
export async function GET(){
 if(!await adminUser())return json({error:'Acceso reservado a la administración.'},403);
 try{const [people,trainings,attempts,resets]=await Promise.all([select('people',{select:'person,name,doc_type',order:'name.asc',limit:'10000'}),allTrainings(),select('attempts',{select:'person,training_id,score,total,date',order:'date.desc',limit:'10000'}),select('resets',{select:'person,training_id,reset_at',limit:'10000'})]);return json({people:people.map(p=>({...p,attempts:attempts.filter(a=>a.person===p.person),resets:resets.filter(r=>r.person===p.person)})),trainings:trainings.map(t=>({id:t.id,title:t.title}))})}catch{return json({error:'No se pudo cargar el personal.'},500)}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 const admin=await adminUser();if(!admin)return json({error:'Acceso reservado a la administración.'},403);
 try{const raw=await req.text();if(raw.length>1000)return json({error:'Solicitud inválida.'},400);const b=JSON.parse(raw);if(b.action!=='reset'||typeof b.person!=='string'||!/^[a-f0-9]{64}$/.test(b.person))return json({error:'Persona inválida.'},400);const trainingId=String(b.trainingId||'');const trainings=await allTrainings();if(trainingId!=='*'&&!trainings.some(t=>t.id===trainingId))return json({error:'Capacitación inválida.'},400);if(!(await select('people',{select:'person',person:'eq.'+b.person,limit:'1'})).length)return json({error:'Persona no encontrada.'},404);await upsert('resets',{person:b.person,training_id:trainingId,reset_at:new Date().toISOString(),admin_email:admin.email});return json({ok:true,message:'Capacitación reiniciada. Las notas anteriores se conservan.'})}catch{return json({error:'No se pudo reiniciar. Intenta nuevamente.'},500)}
}
