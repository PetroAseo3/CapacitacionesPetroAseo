import {currentAttempts} from '@/lib/current-attempts';
import {adminUser} from '@/lib/admin-auth';
import {select,upsert} from '@/lib/supabase';
import {json,sameOrigin,allTrainings} from '@/lib/portal';
export async function GET(req:Request){
 if(!await adminUser())return json({error:'Acceso reservado a la administración.'},403);
 try{const [people,trainings,attempts,resets]=await Promise.all([select('people',{select:'person,name,doc_type',order:'name.asc',limit:'10000'}),allTrainings(),select('attempts',{select:'person,training_id,score,total,date',order:'date.desc',limit:'10000'}),select('resets',{select:'person,training_id,reset_at',limit:'10000'})]);const active=currentAttempts(attempts,resets);const url=new URL(req.url);
 if(url.searchParams.get('download')==='1'){
 const training=url.searchParams.get('training')||'*';if(training!=='*'&&!trainings.some(t=>t.id===training))return json({error:'Capacitación inválida.'},400);
 const title=training==='*'?'Todas las capacitaciones':trainings.find(t=>t.id===training)!.title;
 const cell=(value:unknown)=>{let text=String(value??'');if(/^\s*[=+@-]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"'};
 const rows=[['Apellidos y nombres','Tipo de documento','Capacitación','Exámenes actuales','Última nota (%)','Estado'],...people.map(p=>{const a=active.filter(a=>a.person===p.person&&(training==='*'||a.training_id===training));return [p.name,p.doc_type,title,a.length,a[0]?Math.round(a[0].score*10000/a[0].total)/100:0,a.length?'Realizado':'Pendiente']})];
 return new Response('\uFEFFsep=;\r\n'+rows.map(row=>row.map(cell).join(';')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="personal-petroaseo.csv"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 }
 return json({people:people.map(p=>({...p,attempts:active.filter(a=>a.person===p.person)})),trainings:trainings.map(t=>({id:t.id,title:t.title}))})}catch{return json({error:'No se pudo cargar el personal.'},500)}
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 const admin=await adminUser();if(!admin)return json({error:'Acceso reservado a la administración.'},403);
 try{const raw=await req.text();if(raw.length>1000)return json({error:'Solicitud inválida.'},400);const b=JSON.parse(raw);if(b.action!=='reset'||typeof b.person!=='string'||!/^[a-f0-9]{64}$/.test(b.person))return json({error:'Persona inválida.'},400);const trainingId=String(b.trainingId||'');const trainings=await allTrainings();if(trainingId!=='*'&&!trainings.some(t=>t.id===trainingId))return json({error:'Capacitación inválida.'},400);if(!(await select('people',{select:'person',person:'eq.'+b.person,limit:'1'})).length)return json({error:'Persona no encontrada.'},404);await upsert('resets',{person:b.person,training_id:trainingId,reset_at:new Date().toISOString(),admin_email:admin.email});return json({ok:true,message:'Capacitación reiniciada: 0 exámenes y puntaje en 0.'})}catch{return json({error:'No se pudo reiniciar. Intenta nuevamente.'},500)}
}
