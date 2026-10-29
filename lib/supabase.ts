import 'server-only';
function settings(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw Error('Falta configurar Supabase en el servidor.');return {url:url.replace(/\/$/,''),key}}
async function request(path:string,init:RequestInit={}){const {url,key}=settings();const response=await fetch(url+'/rest/v1/'+path,{...init,cache:'no-store',headers:{apikey:key,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('No se pudo completar la operación de datos ('+response.status+').');const text=await response.text();return text?JSON.parse(text):null}
export async function select(table:string,query:Record<string,string>):Promise<any[]>{return await request('petro_'+table+'?'+new URLSearchParams(query))||[]}
export async function insert(table:string,value:unknown,ignoreDuplicates=false){return request('petro_'+table,{method:'POST',headers:{Prefer:ignoreDuplicates?'resolution=ignore-duplicates,return=minimal':'return=minimal'},body:JSON.stringify(value)})}
export async function rpc(name:string,body:unknown):Promise<any>{return request('rpc/'+name,{method:'POST',body:JSON.stringify(body)})}

export async function upsert(table:string,value:unknown){return request('petro_'+table,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(value)})}
