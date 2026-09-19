import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function configured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);}
export async function serverClient(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll:()=>jar.getAll(),setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server components cannot refresh cookies; proxy handles refresh. */}}}});}
export async function requireAdmin(){if(!configured())throw new Error('먼저 Supabase를 연결해 주세요.');const db=await serverClient();const {data:{user},error}=await db.auth.getUser();if(error||!user)throw new Error('다시 로그인해 주세요.');const result=await db.rpc('is_admin');if(result.error||!result.data)throw new Error('등록된 관리자만 접근할 수 있습니다.');return db;}
