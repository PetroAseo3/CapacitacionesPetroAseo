import {currentAttempts} from '@/lib/current-attempts';
import {select,insert} from '@/lib/supabase';
import {json,config,hash,sign,verify,staff,personName,limit,sameOrigin,catalog,getTraining,availability,savedResult} from '@/lib/portal';
export const dynamic='force-dynamic';
export async function POST(req:Request){if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);try{const raw=await req.text();if(raw.length>30000)return json({error:'Solicitud demasiado grande.'},413);const b=JSON.parse(raw);
if(b.action==='identify'){
if(!await limit(req))return json({error:'Demasiadas consultas. Espera un minuto e intenta de nuevo.'},429);
const type=b.docType,doc=String(b.document||'').trim();if(!['DNI','CE'].includes(type)||!(type==='DNI'?/^\d{8}$/:/^\d{8,12}$/).test(doc))return json({error:'Revisa el tipo y número de documento.'},400);
const person=await hash(config().EXAM_SECRET+':'+type+':'+doc),name=await personName(person);if(!name)return json({error:'No encontramos tu documento. Revisa los dígitos o consulta con tu supervisor.'},404);
return json({name,token:await sign({person,scope:'staff',exp:Date.now()+14400000}),trainings:await catalog(person)});
}
if(b.action==='submit'){
const session=await verify(b.token,'exam');if(!session)return json({error:'La sesión venció. Ingresa nuevamente con tu documento.'},401);
const name=await personName(session.person);if(!name)return json({error:'Registro no disponible. Consulta a tu supervisor.'},403);
const existing=(await select('attempts',{select:'*',id:'eq.'+session.id,person:'eq.'+session.person,limit:'1'}))[0];if(existing){const rs=await select('resets',{select:'person,training_id,reset_at',person:'eq.'+session.person});if(!currentAttempts([existing],rs).length)return json({error:'Este examen fue reiniciado. Comienza uno nuevo desde tus capacitaciones.'},409);return json(savedResult(existing));}
const t=await getTraining(session.trainingId);if(!t||availability(t)!=='open')return json({error:'Esta capacitación no está disponible en este momento.'},403);
const resets=await select('resets',{select:'reset_at,training_id',person:'eq.'+session.person});if(resets.some(r=>(r.training_id==='*'||r.training_id===t.id)&&Date.parse(r.reset_at)>Number(session.issuedAt||0)))return json({error:'La administración reinició esta capacitación. Vuelve al listado y comienza nuevamente.'},409);
if(t.revision!==session.revision)return json({error:'La capacitación cambió. Vuelve al listado y comienza la nueva versión.'},409);
const answers=b.answers;if(!answers||typeof answers!=='object'||t.questions.some(q=>!Number.isInteger(answers[q.id])||answers[q.id]<0||answers[q.id]>=q.options.length))return json({error:'Responde todas las preguntas antes de terminar.'},400);
const score=t.questions.reduce((n,q)=>n+(answers[q.id]===q.answer?1:0),0),date=new Date().toISOString();
await insert('attempts',{id:session.id,person:session.person,name,score,total:t.questions.length,version:3,date,consent:0,answers:JSON.stringify(answers),training_id:t.id,training_revision:t.revision,snapshot:JSON.stringify({title:t.title,questions:t.questions})},true);
const saved=(await select('attempts',{select:'*',id:'eq.'+session.id,person:'eq.'+session.person,limit:'1'}))[0];if(!saved)throw Error('Save failed');return json(savedResult(saved));
}
const user=await staff(b.token);if(!user)return json({error:'La sesión venció. Ingresa nuevamente con tu documento.'},401);
if(b.action==='ranking')return json({error:'La tabla de resultados compartidos ya no está disponible.'},410);
if(b.action==='list')return json({trainings:await catalog(user.person)});
if(b.action==='history'){const r=await select('attempts',{select:'*',person:'eq.'+user.person,order:'date.desc',limit:'100'});return json({results:currentAttempts(r,await select('resets',{select:'person,training_id,reset_at',person:'eq.'+user.person})).map((r:any)=>({...savedResult(r),trainingId:r.training_id,revision:r.training_revision}))})}
if(b.action==='open'){
const t=await getTraining(String(b.trainingId||''));if(!t||availability(t)!=='open')return json({error:'La capacitación no está disponible. Revisa sus fechas de apertura y cierre.'},403);
return json({training:{id:t.id,title:t.title,description:t.description,videos:t.videos,questions:t.questions.map(({answer,...q})=>q),revision:t.revision,endsAt:t.endsAt},examToken:await sign({person:user.person,scope:'exam',trainingId:t.id,revision:t.revision,issuedAt:Date.now(),id:crypto.randomUUID(),exp:Date.now()+14400000})})}
return json({error:'Solicitud inválida.'},400);
}catch{ return json({error:'No pudimos completar la operación. Intenta nuevamente.'},500)}}
