import 'server-only';
function settings(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw Error('Falta configurar Supabase en el servidor.');return {url:url.replace(/\/$/,''),key}}
async function request(path:string,init:RequestInit={},pageInfo=false){const {url,key}=settings();const response=await fetch(url+'/rest/v1/'+path,{...init,cache:'no-store',headers:{apikey:key,'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('No se pudo completar la operación de datos ('+response.status+').');const text=await response.text();const data=text?JSON.parse(text):null;if(pageInfo){const count=response.headers.get('content-range')?.split('/')[1];return {rows:data||[],total:count&&count!=='*'?Number(count):null}}return data}
export async function select(table:string,query:Record<string,string>):Promise<any[]>{return await request('petro_'+table+'?'+new URLSearchParams(query))||[]}
export async function insert(table:string,value:unknown,ignoreDuplicates=false){return request('petro_'+table,{method:'POST',headers:{Prefer:ignoreDuplicates?'resolution=ignore-duplicates,return=minimal':'return=minimal'},body:JSON.stringify(value)})}
export async function rpc(name:string,body:unknown):Promise<any>{return request('rpc/'+name,{method:'POST',body:JSON.stringify(body)})}

export async function upsert(table:string,value:unknown){return request('petro_'+table,{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(value)})}

export async function selectAll(table:string,query:Record<string,string>):Promise<any[]>{
 const rows:any[]=[];let offset=0;
 while(true){const page=await request('petro_'+table+'?'+new URLSearchParams({...query,limit:'500',offset:String(offset)}),{headers:{Prefer:'count=exact'}},true);if(!Array.isArray(page.rows))throw Error('Invalid data page');rows.push(...page.rows);offset+=page.rows.length;if(!page.rows.length||(page.total!==null&&offset>=page.total))return rows;}
}
