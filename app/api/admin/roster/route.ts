import {adminUser} from '@/lib/admin-auth';
import {config,db,hash,json,roster,sameOrigin} from '@/lib/portal';
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
 const old=await db().prepare('SELECT payload_hash,stats FROM roster_imports WHERE id=?').bind(importId).first<{payload_hash:string;stats:string}>();
 if(old){if(old.payload_hash!==payloadHash)return json({error:'Este identificador ya se usó para otra relación.'},409);return json({...JSON.parse(old.stats),replayed:true})}
 const known=new Map(Object.entries(roster()));const stored=await db().prepare('SELECT person,name FROM people').all();for(const p of stored.results)known.set(String(p.person),String(p.name));
 let added=0,updated=0,unchanged=0;for(const [person,row] of incoming){if(!known.has(person))added++;else if(known.get(person)!==row.name)updated++;else unchanged++}
 const retained=[...known.keys()].filter(id=>!incoming.has(id)).length;
 const stats={received:b.people.length,unique:incoming.size,duplicates,added,updated,unchanged,retained,total:known.size+added,deleted:0};
 if(b.dryRun===true)return json({...stats,dryRun:true});
 const now=new Date().toISOString();
 const writes=[];const entries=[...incoming];for(let i=0;i<entries.length;i+=20){const chunk=entries.slice(i,i+20);writes.push(db().prepare('INSERT INTO people (person,doc_type,name,created_at,updated_at) VALUES '+chunk.map(()=>'(?,?,?,?,?)').join(',')+' ON CONFLICT(person) DO UPDATE SET name=excluded.name,doc_type=excluded.doc_type,updated_at=excluded.updated_at WHERE people.name<>excluded.name OR people.doc_type<>excluded.doc_type').bind(...chunk.flatMap(([person,row])=>[person,row.docType,row.name,now,now])))}
 const snapshot='SELECT id,person,name,score,total,version,date,consent,answers,training_id,training_revision,snapshot FROM attempts ORDER BY id';
 const results=await db().batch([db().prepare(snapshot),...writes,db().prepare('INSERT INTO roster_imports (id,source,payload_hash,stats,created_at) VALUES (?,?,?,?,?)').bind(importId,source,payloadHash,JSON.stringify(stats),now),db().prepare(snapshot)]);
 const before=JSON.stringify(results[0].results),after=JSON.stringify(results[results.length-1].results);
 return json({...stats,attemptsPreserved:before===after,attemptsCount:results[0].results.length});
 }catch{return json({error:'No se pudo importar la relación. Verifica el archivo e intenta nuevamente.'},500)}
}
