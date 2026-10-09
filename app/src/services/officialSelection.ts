import {fieldStates, type Field, type OfficialReport, type Evidence} from './officialCandidates';
import {fieldsForPerformances,type OfficialFields} from './officialImport';
export const scheduleFields:Field[]=['startDate','endDate','venue','doorsOpen','startTime','endTime','openingTime','closingTime','lastAdmission'];
export interface ImportSelection {fields:Partial<Record<Field,string>>;shows:string[];rounds:string[]}
export const emptySelection=():ImportSelection=>({fields:{},shows:[],rounds:[]});
export function chooseFields(selection:ImportSelection,report:OfficialReport,id:string,keys:Field[],checked:boolean):ImportSelection {
 const candidate=report.candidates.find(c=>c.id===id);if(!candidate)return selection;
 const fields={...selection.fields};if(keys.some(k=>scheduleFields.includes(k)))for(const k of scheduleFields)delete fields[k];
 for(const k of keys)if(checked&&candidate.fields[k])fields[k]=id;else if(fields[k]===id)delete fields[k];
 return {...selection,fields,shows:keys.some(k=>scheduleFields.includes(k))?[]:selection.shows};
}
export function applySelection(report:OfficialReport,selection:ImportSelection){
 const fields:OfficialFields={};const evidence:Partial<Record<Field,Evidence[]>>={};
 for(const [key,id] of Object.entries(selection.fields)){const c=report.candidates.find(c=>c.id===id);const k=key as Field;if(c?.fields[k]){fields[k]=c.fields[k];if(c.evidence[k])evidence[k]=[c.evidence[k]!];}}
 const selected=report.candidates.filter(c=>selection.shows.includes(c.id)&&c.performance);
 const shows=[...new Map(selected.map(c=>[JSON.stringify(c.performance),c.performance!])).values()];
 if(shows.length){for(const key of scheduleFields){delete fields[key];const proof=selected.flatMap(c=>c.evidence[key]?[c.evidence[key]!]:[]);if(proof.length)evidence[key]=proof;}Object.assign(fields,fieldsForPerformances(shows));}
 const rounds=report.candidates.flatMap(c=>c.lotteries.filter((_,i)=>selection.rounds.includes(`${c.id}:${i}`)));
 const states=fieldStates(report.candidates,report.issues);for(const key of Object.keys(states) as Field[])if(report.fields[key].applied)states[key]={...states[key],status:'found',applied:report.fields[key].applied};for(const [k,proof]of Object.entries(evidence))states[k as Field]={status:'found',applied:proof};
 return {fields,shows,rounds,report:{...report,fields:states}};
}

export function retainApplied(previous:OfficialReport|undefined,next:OfficialReport):OfficialReport {
 if(!previous)return next;const fields={...next.fields};for(const key of Object.keys(fields) as Field[])if(previous.fields[key].applied)fields[key]={...fields[key],applied:previous.fields[key].applied};return {...next,fields};
}
