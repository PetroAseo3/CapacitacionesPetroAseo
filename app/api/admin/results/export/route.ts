import {adminUser} from '@/lib/admin-auth';
import {allTrainings,json} from '@/lib/portal';
import {selectAll} from '@/lib/supabase';
import {resultRows,resultsWorkbook} from '@/lib/results-export';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(req:Request){
 if(!await adminUser())return json({error:'Acceso reservado a la administración.'},403);
 try{
  const id=new URL(req.url).searchParams.get('training')||'*',all=await allTrainings();
  const trainings=id==='*'?all.filter(t=>t.published):all.filter(t=>t.id===id);
  if(id!=='*'&&!trainings.length)return json({error:'Capacitación no encontrada.'},404);
  const [people,attempts,resets]=await Promise.all([
   selectAll('people',{select:'person,name,doc_type',order:'name.asc,person.asc'}),
   selectAll('attempts',{select:'id,person,training_id,training_revision,score,total,date',order:'date.desc,id.desc',...(id!=='*'?{training_id:'eq.'+id}:{})}),
   selectAll('resets',{select:'person,training_id,reset_at',order:'person.asc,training_id.asc'})
  ]);
  const bytes=await resultsWorkbook(resultRows(people,trainings,attempts,resets),people.length);
  const day=new Date().toLocaleDateString('en-CA',{timeZone:'America/Lima'});
  return new Response(bytes,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="resultados-petroaseo-${day}.xlsx"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return json({error:'No se pudo generar el Excel de resultados. Intenta nuevamente.'},500)}
}
