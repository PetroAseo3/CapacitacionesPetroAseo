import {select,rpc} from '@/lib/supabase';
import {adminUser} from '@/lib/admin-auth';
import {config,hash,json,roster,sameOrigin} from '@/lib/portal';
export const dynamic='force-dynamic';
async function access(req:Request){
 const supplied=req.headers.get('X-Roster-Import')||'';
 if(supplied){try{const grant=JSON.parse(config().ROSTER_IMPORT_ACCESS||'{}');return typeof grant.token==='string'&&Date.parse(grant.expiresAt)>Date.now()&&await hash(supplied)===await hash(grant.token)}catch{return false}}
 return !!await adminUser();
}
export async function POST(req:Request){
 if(!sameOrigin(req))return json({error:'Solicitud no permitida.'},403);
 if(!await access(req))return json({error:'Acceso reservado a la administración.'},403);
 try{
 const raw=await req.text();if(raw.length>250000)return json({error:'Archivo demasiado grande.'},413);
 const b=JSON.parse(raw);if(!Array.isArray(b.people)||b.people.length<1||b.people.length>1500)return json({error:'La relación debe tener entre 1 y 1500 personas.'},400);
 const importId=String(b.importId||''),source=String(b.source||'Actualización de personal').trim().slice(0,160);
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(importId))return json({error:'Identificador de importación inválido.'},400);
 const incoming=new Map<string,{docType:string;name:string}>();let duplicates=0;
 for(const row of b.people){
  const type=String(row.docType||'').trim().toUpperCase(),doc=String(row.document||'').trim(),name=String(row.name||'').trim().replace(/\s+/g,' ');
  if(!['DNI','CE'].includes(type)||!(type==='DNI'?/^\d{8}$/:/^\d{8,12}$/).test(doc)||!name||name.length>200)return json({error:'Hay documentos o nombres inválidos. No se importó ningún registro.'},400);
  const person=await hash(config().EXAM_SECRET+':'+type+':'+doc),prior=incoming.get(person);
  if(prior&&prior.name!==name)return json({error:'Un documento tiene dos nombres diferentes. Revisa la relación antes de importar.'},400);
  if(prior)duplicates++;
  incoming.set(person,{docType:type,name});
 }
 const payloadHash=await hash(JSON.stringify({source,people:[...incoming].sort(([a],[b])=>a.localeCompare(b))}));
 const old=(await select('roster_imports',{select:'payload_hash,stats',id:'eq.'+importId,limit:'1'}))[0];
 if(old){if(old.payload_hash!==payloadHash)return json({error:'Este identificador ya se usó para otra relación.'},409);return json({...JSON.parse(old.stats),replayed:true})}
 const known=new Map(Object.entries(roster()));const stored=await select('people',{select:'person,name',limit:'10000'});for(const p of stored)known.set(String(p.person),String(p.name));
 let added=0,updated=0,unchanged=0;for(const [person,row] of incoming){if(!known.has(person))added++;else if(known.get(person)!==row.name)updated++;else unchanged++}
 const retained=[...known.keys()].filter(id=>!incoming.has(id)).length;
 const stats={received:b.people.length,unique:incoming.size,duplicates,added,updated,unchanged,retained,total:known.size+added,deleted:0};
 if(b.dryRun===true)return json({...stats,dryRun:true});
 const saved=await rpc('petro_import_roster',{p_id:importId,p_source:source,p_hash:payloadHash,p_stats:stats,p_people:[...incoming].map(([person,row])=>({person,doc_type:row.docType,name:row.name}))});
 return json(saved);

 }catch{return json({error:'No se pudo importar la relación. Verifica el archivo e intenta nuevamente.'},500)}
}
