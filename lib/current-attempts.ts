export type Reset={person?:string;training_id:string;reset_at:string};
export function currentAttempts<T extends {person?:string;training_id:string;date:string}>(attempts:T[],resets:Reset[]):T[]{
 return attempts.filter(a=>!resets.some(r=>(!r.person||r.person===a.person)&&(r.training_id==='*'||r.training_id===a.training_id)&&Date.parse(a.date)<=Date.parse(r.reset_at)));
}
