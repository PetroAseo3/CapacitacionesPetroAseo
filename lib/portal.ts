import 'server-only';
import {select,rpc,insert} from './supabase';
import {questions} from './questions';
import {legacyQuestions} from './legacy-questions';
export type Video={id:string;title:string};
export type Question={id:number;text:string;options:string[];answer:number};
export type Training={id:string;title:string;description:string;videos:Video[];questions:Question[];published:boolean;startsAt:string|null;endsAt:string|null;revision:number;updatedAt:string};
export const defaultTraining:Training={id:'induccion',title:'Inducción del personal',description:'Seguridad en el trabajo y segregación de residuos.',videos:[{id:'jPpKOMRzf7s',title:'Inducción del personal'},{id:'k87GBMUtS8A',title:'Segregación de residuos'}],questions,published:true,startsAt:null,endsAt:null,revision:1,updatedAt:'2026-10-22T19:30:19.249Z'};
export function config(){return process.env as Record<string,string>}
export function json(b:unknown,status=200){return Response.json(b,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})}
const enc=new TextEncoder();
export async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('')}
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64(s:string){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))}
async function key(){const secret=config().EXAM_SECRET;if(!secret)throw Error('Configuration unavailable');return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
export async function sign(p:unknown){const text=b64(enc.encode(JSON.stringify(p)));return text+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),enc.encode(text))))}
export async function verify(token:unknown,scope:string){try{if(typeof token!=='string'||token.length>4000)return null;const [p,s]=token.split('.');if(!p||!s||!await crypto.subtle.verify('HMAC',await key(),unb64(s),enc.encode(p)))return null;const data=JSON.parse(new TextDecoder().decode(unb64(p)));return data.scope===scope&&data.exp>Date.now()?data:null}catch{return null}}
export function roster(){const r:Record<string,string>={};for(let i=0;i<20;i++)if(config()['ROSTER_'+i])Object.assign(r,JSON.parse(config()['ROSTER_'+i]));return r}
export async function personName(person:string){const found=(await select('people',{select:'name',person:'eq.'+person,limit:'1'}))[0];return found?.name||roster()[person]||null}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(!origin)return true;try{const o=new URL(origin),url=new URL(req.url),host=req.headers.get('host')||url.host,protocol=(req.headers.get('x-forwarded-proto')||url.protocol.slice(0,-1))+':';return o.host===host&&o.protocol===protocol}catch{return false}}
export async function limit(req:Request){const bucket=Math.floor(Date.now()/60000),ip=req.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';const key=await hash(config().EXAM_SECRET+':rate:'+ip)+':'+bucket;return Number(await rpc('petro_rate_limit',{p_key:key,p_bucket:bucket}))<=20}

function decode(row:any):Training{return {id:row.id,title:row.title,description:row.description,videos:JSON.parse(row.videos),questions:JSON.parse(row.questions),published:!!row.published,startsAt:row.starts_at,endsAt:row.ends_at,revision:row.revision,updatedAt:row.updated_at}}
export async function allTrainings(){const rows=await select('trainings',{select:'*',order:'updated_at.desc'});const list=rows.map(decode);if(!list.some(t=>t.id==='induccion'))list.push(defaultTraining);return list}
export async function getTraining(id:string){const row=(await select('trainings',{select:'*',id:'eq.'+id,limit:'1'}))[0];return row?decode(row):id==='induccion'?defaultTraining:null}
export function availability(t:Training,now=Date.now()){if(!t.published)return 'draft';if(t.startsAt&&Date.parse(t.startsAt)>now)return 'scheduled';if(t.endsAt&&Date.parse(t.endsAt)<=now)return 'closed';return 'open'}
export async function catalog(person:string){const [all,rows]=await Promise.all([allTrainings(),rpc('petro_attempt_summary',{p_person:person})]);return all.filter(t=>t.published).map(t=>{const prior=rows.filter((r:any)=>r.training_id===t.id);const current=prior.find((r:any)=>r.training_revision===t.revision);return {id:t.id,title:t.title,description:t.description,videoCount:t.videos.length,questionCount:t.questions.length,startsAt:t.startsAt,endsAt:t.endsAt,revision:t.revision,status:availability(t),completed:!!current,percentage:current?Math.round(Number(current.ratio)*10000)/100:null,hasPrevious:prior.length>0}})}
export function savedResult(s:any){const snap=s.snapshot?JSON.parse(s.snapshot):null;const bank:Question[]=snap?.questions||(s.version===1?legacyQuestions:questions);const a=JSON.parse(s.answers);return {trainingId:s.training_id,revision:s.training_revision,score:s.score,total:s.total,percentage:Math.round(s.score*10000/s.total)/100,date:s.date,receipt:s.id.slice(0,8).toUpperCase(),title:snap?.title||defaultTraining.title,review:bank.map(q=>({id:q.id,text:q.text,correct:a[q.id]===q.answer,selected:q.options[a[q.id]],answer:q.options[q.answer]}))}}
export async function staff(token:unknown){const s=await verify(token,'staff');if(!s)return null;const name=await personName(s.person);return name?{...s,name}:null}
export function normalize(input:any):Omit<Training,'revision'|'updatedAt'>{
 if(!input||typeof input!=='object')throw Error('Revisa los datos de la capacitación.');
 const id=String(input.id||'');if(!/^[a-z0-9-]{1,80}$/.test(id))throw Error('Identificador inválido.');
 const title=String(input.title||'').trim();if(!title||title.length>160)throw Error('Escribe un título de hasta 160 caracteres.');
 const description=String(input.description||'').trim();if(description.length>1200)throw Error('La descripción admite hasta 1200 caracteres.');
 if(!Array.isArray(input.videos)||input.videos.length>20||!Array.isArray(input.questions)||input.questions.length>100)throw Error('Máximo 20 videos y 100 preguntas por capacitación.');
 const published=input.published===true;
 const videos=input.videos.map((v:any)=>({id:String(v.id||'').trim(),title:String(v.title||'').trim()}));
 if(videos.some((v:Video)=>(v.id&&!/^[A-Za-z0-9_-]{11}$/.test(v.id))||v.title.length>160))throw Error('Revisa los enlaces y títulos de los videos de YouTube.');
 const qs=input.questions.map((q:any,i:number)=>{if(!Array.isArray(q.options)||q.options.length<2||q.options.length>4)throw Error('Cada pregunta necesita de 2 a 4 alternativas.');const text=String(q.text||'').trim(),options=q.options.map((o:any)=>String(o||'').trim());if(text.length>1200||options.some((o:string)=>o.length>800)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=options.length)throw Error('Revisa el texto y la respuesta correcta de cada pregunta.');return {id:i+1,text,options,answer:q.answer}});
 if(published&&(!videos.length||videos.some((v:Video)=>!v.id||!v.title)||!qs.length||qs.some((q:Question)=>!q.text||q.options.some(o=>!o))))throw Error('Para publicar, completa al menos un video y una pregunta con todas sus alternativas.');
 const startsAt=input.startsAt||null,endsAt=input.endsAt||null;
 if([startsAt,endsAt].some(d=>d!==null&&(typeof d!=='string'||!Number.isFinite(Date.parse(d)))))throw Error('Revisa las fechas.');
 if(startsAt&&endsAt&&Date.parse(endsAt)<=Date.parse(startsAt))throw Error('El cierre debe ser posterior a la apertura.');
 return {id,title,description,videos,questions:qs,published,startsAt:startsAt?new Date(startsAt).toISOString():null,endsAt:endsAt?new Date(endsAt).toISOString():null};
}
