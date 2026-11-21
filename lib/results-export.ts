import ExcelJS from 'exceljs';
import {currentAttempts, type Reset} from './current-attempts';

type Person={person:string;name:string;doc_type:string};
type Course={id:string;title:string;revision:number;questions:unknown[]};
type Attempt={person:string;training_id:string;training_revision:number;date:string;score:number;total:number;id?:string};
export type ResultRow={name:string;docType:string;training:string;revision:number;status:'Realizado'|'Pendiente';attempts:number;percentage:number;score:number;total:number;date:string};

export function resultRows(people:Person[],trainings:Course[],attempts:Attempt[],resets:Reset[]):ResultRow[]{
 const latest=new Map<string,Attempt>();const counts=new Map<string,number>();
 for(const a of currentAttempts(attempts,resets)){
  const key=JSON.stringify([a.person,a.training_id,a.training_revision]);counts.set(key,(counts.get(key)||0)+1);
  const previous=latest.get(key);if(!previous||Date.parse(a.date)>Date.parse(previous.date)||(a.date===previous.date&&(a.id||'')>(previous.id||'')))latest.set(key,a);
 }
 return trainings.flatMap(t=>people.map(p=>{
  const key=JSON.stringify([p.person,t.id,t.revision]),a=latest.get(key);
  return {name:p.name,docType:p.doc_type,training:t.title,revision:t.revision,status:a?'Realizado' as const:'Pendiente' as const,attempts:counts.get(key)||0,percentage:a?Math.round(a.score*10000/a.total)/100:0,score:a?.score||0,total:a?.total||t.questions.length,date:a?.date||''};
 }));
}

export async function resultsWorkbook(rows:ResultRow[],peopleCount:number,generatedAt=new Date()){
 const workbook=new ExcelJS.Workbook();workbook.creator='PetroAseo';workbook.created=generatedAt;
 const sheet=workbook.addWorksheet('Resultados',{views:[{state:'frozen',ySplit:6}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 sheet.columns=[{width:7},{width:46},{width:15},{width:38},{width:12},{width:17},{width:13},{width:15},{width:13},{width:15},{width:24}];
 sheet.mergeCells('A1:K1');sheet.getCell('A1').value='PETROASEO · RESULTADOS DE CAPACITACIONES';sheet.getRow(1).height=32;sheet.getCell('A1').font={name:'Aptos',size:16,bold:true,color:{argb:'FFB30E2E'}};
 const done=rows.filter(r=>r.status==='Realizado').length;
 sheet.mergeCells('A2:K2');sheet.getCell('A2').value=`Personal registrado: ${peopleCount} · Realizados: ${done} · Pendientes: ${rows.length-done}`;
 sheet.mergeCells('A3:K3');sheet.getCell('A3').value='Incluye a todo el personal. Una fila por persona y capacitación; se considera la versión actual y los reinicios.';
 sheet.mergeCells('A4:K4');sheet.getCell('A4').value='Generado: '+generatedAt.toLocaleString('es-PE',{timeZone:'America/Lima'})+' (Lima). Los pendientes figuran con 0% y sin fecha de examen.';
 const headers=['N.º','Apellidos y nombres','Tipo documento','Capacitación','Versión actual','Estado','Intentos','Última nota (%)','Correctas','Total preguntas','Fecha del examen (Lima)'];
 sheet.getRow(6).values=headers;sheet.getRow(6).height=32;
 sheet.getRow(6).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFB30E2E'}};cell.font={name:'Aptos',bold:true,color:{argb:'FFFFFFFF'}};cell.alignment={vertical:'middle',wrapText:true}});
 for(const [i,r] of rows.entries()){
  const row=sheet.addRow([i+1,r.name,r.docType,r.training,r.revision,r.status,r.attempts,r.percentage,r.score,r.total,r.date?new Date(r.date).toLocaleString('es-PE',{timeZone:'America/Lima'}):'']);
  row.height=32;row.eachCell({includeEmpty:true},cell=>{cell.font={name:'Aptos',size:11,color:{argb:'FF1E293B'}};cell.alignment={vertical:'middle',wrapText:true};if(i%2===0)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}}});
  row.getCell(8).numFmt='0.00"%"';row.getCell(6).font={name:'Aptos',size:11,bold:true,color:{argb:r.status==='Realizado'?'FF166534':'FF92400E'}};
 }
 sheet.autoFilter={from:{row:6,column:1},to:{row:Math.max(6,rows.length+6),column:11}};
 sheet.pageSetup.printTitlesRow='1:6';
 return new Uint8Array(await workbook.xlsx.writeBuffer());
}
