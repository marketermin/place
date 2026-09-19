import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const admin='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const ordinary='33333333-3333-4333-8333-333333333333';
test('real PostgreSQL schema: persistence, upsert, thresholds, read state, corrections, RLS, unauthorized RPC',async()=>{
const path=await mkdtemp(join(tmpdir(),'place-days-db-'));let db=new PGlite(path);
try{
await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon; insert into auth.users values('${admin}'),('${other}'),('${ordinary}');`);
await db.exec(await readFile(new URL('../supabase/001_initial.sql',import.meta.url),'utf8'));
await db.exec(`insert into public.admins values('${admin}'),('${other}'); set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false);`);
const b=(await db.query<{id:string}>(`select public.save_business(null,'시험 업장','https://map.naver.com/p/entry/place/123','2026-01-01',array['검색어 A','검색어 B']) id`)).rows[0].id;
const k=(await db.query<{id:string}>(`select id from public.keywords where term='검색어 A'`)).rows[0].id;
async function rank(day:string,value:number|null){await db.query(`select public.save_rank($1,$2,$3,'서울','모바일 네이버 지도 · 기본 정렬 · 광고 제외','')`,[k,day,value]);}
async function snapshot(){return (await db.query<{data:any}>('select public.dashboard() data')).rows[0].data;}
for(let i=1;i<=19;i++)await rank(`2026-01-${String(i).padStart(2,'0')}`,5);
assert.equal((await snapshot()).notices.length,0);
await rank('2026-01-20',6);assert.equal((await snapshot()).notices.length,0);
await rank('2026-01-20',5);assert.equal((await snapshot()).notices[0].stage,20);
await rank('2026-01-20',5);assert.equal((await snapshot()).ranks.length,20);assert.equal((await snapshot()).notices.length,1);
for(let i=21;i<=25;i++)await rank(`2026-01-${i}`,1);
assert.deepEqual((await snapshot()).notices.map((n:any)=>n.stage),[25,24,23,22,21,20]);
await db.query('select public.read_notice($1,20)',[k]);assert.ok((await snapshot()).notices.find((n:any)=>n.stage===20).read_at);
await rank('2026-01-25',5);assert.ok((await snapshot()).notices.find((n:any)=>n.stage===20).read_at);
await rank('2026-01-01',6);assert.equal((await snapshot()).notices.length,5);assert.equal((await snapshot()).notices.find((n:any)=>n.stage===20).read_at,null);
await rank('2026-01-01',1);await rank('2026-01-26',1);assert.equal((await snapshot()).notices.length,6);assert.equal((await snapshot()).ranks.filter((r:any)=>r.rank<=5).length,26);
await rank('2026-01-26',null);assert.equal((await snapshot()).notices.length,6);
await assert.rejects(()=>rank('2099-01-01',1));await assert.rejects(()=>rank('2026-01-01',0));
await assert.rejects(()=>db.exec(`insert into public.notices values('${k}',25,'2026-01-01',null)`));
await db.exec(`select set_config('request.jwt.claim.sub','${other}',false)`);assert.equal((await snapshot()).businesses.length,0);assert.equal((await snapshot()).ranks.length,0);assert.equal((await snapshot()).notices.length,0);await assert.rejects(()=>rank('2026-01-01',1));await assert.rejects(()=>db.query('select public.delete_business($1)',[b]));
await db.exec(`select set_config('request.jwt.claim.sub','${ordinary}',false)`);assert.equal((await snapshot()).businesses.length,0);await assert.rejects(()=>db.exec(`select public.save_business(null,'해킹','https://map.naver.com/','2026-01-01',array['x'])`));await assert.rejects(()=>db.exec(`insert into public.admins values('${ordinary}')`));
await db.exec(`reset role; set role anon; select set_config('request.jwt.claim.sub','',false)`);await assert.rejects(()=>db.exec('select * from public.ranks'));await assert.rejects(()=>db.exec('select public.dashboard()'));await assert.rejects(()=>rank('2026-01-01',1));
await db.close();db=new PGlite(path);await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${admin}',false)`);assert.equal((await snapshot()).ranks.length,26);
await db.query(`select public.save_business($1,'시험 업장','https://map.naver.com/','2026-01-10',array['검색어 A','검색어 B'])`,[b]);assert.equal((await snapshot()).notices.length,0);
await db.query('select public.delete_business($1)',[b]);const end=await snapshot();assert.equal(end.ranks.length,0);assert.equal(end.notices.length,0);assert.equal(end.keywords.length,0);
}finally{await db.close();await rm(path,{recursive:true,force:true});}
});
