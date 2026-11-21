import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript'),ExcelJS=require('exceljs');
const temp=await mkdtemp(join(tmpdir(),'petroaseo-export-test-'));
const files=[];
async function compile(name,replace=[]){
 let source=await readFile(new URL('../lib/'+name+'.ts',import.meta.url),'utf8');
 for(const [from,to] of replace)source=source.replace(from,to);
 const path=join(temp,name+'.mjs');files.push(path);
 await writeFile(path,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);
 return import(pathToFileURL(path).href);
}
await compile('current-attempts');
const {resultRows,resultsWorkbook}=await compile('results-export',[["'exceljs'",JSON.stringify(pathToFileURL(require.resolve('exceljs')).href)],["'./current-attempts'","'./current-attempts.mjs'"]]);
const people=['No rindió','Reiniciado','Varias notas','Versión anterior'].map((name,i)=>({person:String(i),name,doc_type:'DNI'}));
const courses=[{id:'curso',title:'Inducción',revision:2,questions:[1,2,3,4]}];
const attempts=[
 {person:'1',training_id:'curso',training_revision:2,date:'2026-11-01T10:00:00Z',score:4,total:4},
 {person:'2',training_id:'curso',training_revision:2,date:'2026-11-02T10:00:00Z',score:3,total:4},
 {person:'2',training_id:'curso',training_revision:2,date:'2026-11-01T10:00:00Z',score:1,total:4},
 {person:'3',training_id:'curso',training_revision:1,date:'2026-11-02T10:00:00Z',score:4,total:4}
];
const resets=[{person:'1',training_id:'*',reset_at:'2026-11-02T10:00:00Z'}];
test('incluye ausentes, aplica reinicios y considera la versión y la última nota',()=>{
 const rows=resultRows(people,courses,attempts,resets);
 assert.equal(rows.length,people.length);
 assert.deepEqual(rows.map(r=>[r.status,r.attempts,r.percentage,r.date]),[
  ['Pendiente',0,0,''],['Pendiente',0,0,''],['Realizado',2,75,'2026-11-02T10:00:00Z'],['Pendiente',0,0,'']
 ]);
 const other={id:'otro',title:'Otra capacitación',revision:1,questions:[1]};
 assert.equal(resultRows(people,[...courses,other],attempts,resets).length,people.length*2);
});
test('genera XLSX válido con filtros, porcentajes numéricos y nombres como texto',async()=>{
 const rows=resultRows([...people,{person:'4',name:'=SUM(A1:A2)',doc_type:'CE'}],courses,attempts,resets);
 const bytes=await resultsWorkbook(rows,5,new Date('2026-11-21T15:00:00Z'));
 assert.equal(Buffer.from(bytes).subarray(0,2).toString(),'PK');
 const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.from(bytes));
 const sheet=workbook.getWorksheet('Resultados');
 assert.equal(sheet.rowCount,11);assert.equal(sheet.getCell('B11').value,'=SUM(A1:A2)');
 assert.equal(sheet.getCell('H9').value,75);assert.equal(sheet.getCell('H7').value,0);
 assert.equal(sheet.getCell('F7').value,'Pendiente');assert.equal(sheet.getCell('K7').value,'');
 assert.ok(sheet.autoFilter);assert.equal(sheet.views[0].ySplit,6);
});
test('paginación reúne todos los registros aunque el servidor limite el tamaño de página',async()=>{
 const {selectAll}=await compile('supabase',[["import 'server-only';",'']]);
 const previousFetch=globalThis.fetch,previousUrl=process.env.SUPABASE_URL,previousKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_URL='https://example.invalid';process.env.SUPABASE_SECRET_KEY='test-only';
 const source=Array.from({length:1207},(_,id)=>({id}));let calls=0;
 globalThis.fetch=async url=>{calls++;const offset=Number(new URL(url).searchParams.get('offset'));return new Response(JSON.stringify(source.slice(offset,offset+200)),{headers:{'Content-Range':`${offset}-${Math.min(offset+199,1206)}/1207`}})};
 try{assert.deepEqual(await selectAll('people',{select:'id',order:'id.asc'}),source);assert.equal(calls,7)}
 finally{globalThis.fetch=previousFetch;if(previousUrl===undefined)delete process.env.SUPABASE_URL;else process.env.SUPABASE_URL=previousUrl;if(previousKey===undefined)delete process.env.SUPABASE_SECRET_KEY;else process.env.SUPABASE_SECRET_KEY=previousKey}
});
test.after(async()=>{for(const file of files)await unlink(file);await rmdir(temp)});
