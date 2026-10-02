import type { EventScheduleItem } from '../types/Event';
export const scheduleTypes: Record<string,EventScheduleItem['type']> = {
  'doors-open':'doorsOpen','performance-start':'start','performance-end':'expectedEnd',
  'screening-start':'screeningStart','screening-end':'screeningEnd','talk-start':'talkStart','talk-end':'talkEnd',
};
export function scheduleTime(schedule:EventScheduleItem[],id:string):string {
  return (schedule.find(item=>item.id===id) ?? schedule.find(item=>item.type===scheduleTypes[id]))?.time ?? '';
}
export function setScheduleTime(schedule:EventScheduleItem[],id:string,type:EventScheduleItem['type'],label:string,time:string):EventScheduleItem[] {
  const index=schedule.findIndex(item=>item.id===id || item.type===type);
  const next=schedule.filter(item=>item.id!==id && item.type!==type);
  next.splice(index<0?next.length:Math.min(index,next.length),0,{id,type,label,time});
  return next;
}
/** Prefer an explicit form edit when older imports created a second ID for the same field. */
export function normalizeSchedule(schedule:EventScheduleItem[]):EventScheduleItem[] {
  let next=[...schedule];
  for(const [id,type] of Object.entries(scheduleTypes)){
    const item=schedule.find(s=>s.id===id)??schedule.find(s=>s.type===type);
    if(item)next=setScheduleTime(next,id,type,item.label,item.time);
  }
  return next;
}
