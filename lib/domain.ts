export type Business = {id:string;name:string;place_url:string;start_date:string};
export type Keyword = {id:string;business_id:string;term:string};
export type Rank = {keyword_id:string;date:string;rank:number|null;location:string;surface:string;note:string;source:'manual'|'provider';updated_at:string};
export type Notice = {keyword_id:string;stage:number;reached_on:string;read_at:string|null};
export type Snapshot = {businesses:Business[];keywords:Keyword[];ranks:Rank[];notices:Notice[]};
export const empty:Snapshot={businesses:[],keywords:[],ranks:[],notices:[]};
export function todayKST(now=new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function shiftDate(date:string,days:number) {const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function qualifying(s:Snapshot,k:Keyword,today=todayKST()) {const b=s.businesses.find(b=>b.id===k.business_id);if(!b)return [];return s.ranks.filter(r=>r.keyword_id===k.id&&r.date>=b.start_date&&r.date<=today&&r.rank!==null&&r.rank>=1&&r.rank<=5).sort((a,b)=>a.date.localeCompare(b.date));}
export function summary(s:Snapshot,k:Keyword,today=todayKST()) {const count=qualifying(s,k,today).length;return {count,remaining:Math.max(0,25-count),status:count>=25?'달성':count>=20?'목표 임박':'관리 중',rank:s.ranks.find(r=>r.keyword_id===k.id&&r.date===today)?.rank??null};}
// All attained milestones remain as history; invalid milestones disappear after corrections.
export function reconcile(s:Snapshot,today=todayKST()):Snapshot {const notices:Notice[]=[];for(const k of s.keywords){const days=qualifying(s,k,today);for(let stage=20;stage<=Math.min(25,days.length);stage++){const old=s.notices.find(n=>n.keyword_id===k.id&&n.stage===stage);const reached_on=days[stage-1].date;notices.push({keyword_id:k.id,stage,reached_on,read_at:old?.reached_on===reached_on?old.read_at:null});}}return {...s,notices};}
export function noticeText(n:Notice){return n.stage===25?'목표 달성! 상위 5위 누적 25일':`목표까지 ${25-n.stage}일 남음`;}
