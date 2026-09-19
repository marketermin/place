import { z } from 'zod';
import { todayKST } from './domain';
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v,'올바른 날짜를 입력해 주세요.');
export const businessSchema=z.object({id:z.uuid().optional(),name:z.string().trim().min(1).max(100),place_url:z.url().refine(v=>{const u=new URL(v);return u.protocol==='https:'&&['map.naver.com','m.place.naver.com','pcmap.place.naver.com','place.naver.com','naver.me'].includes(u.hostname);},'네이버 플레이스 주소를 입력해 주세요.'),start_date:date,keywords:z.array(z.string().trim().min(1).max(100)).min(1).max(50).refine(v=>new Set(v).size===v.length,'같은 검색어는 한 번만 입력해 주세요.')});
export const rankSchema=z.object({keyword_id:z.uuid(),date:date.refine(v=>v<=todayKST(),'미래 날짜에는 순위를 입력할 수 없습니다.'),rank:z.number().int().min(1).max(100000).nullable(),location:z.string().trim().min(1).max(200),surface:z.enum(['모바일 네이버 지도 · 기본 정렬 · 광고 제외','PC 네이버 지도 · 기본 정렬 · 광고 제외']),note:z.string().trim().max(500)});
export type BusinessInput=z.infer<typeof businessSchema>;
export type RankInput=z.infer<typeof rankSchema>;
