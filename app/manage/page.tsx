import {redirect} from 'next/navigation';
import {configured,serverClient} from '@/lib/supabase';
import {loadData} from '@/app/actions';
import Dashboard from '@/components/dashboard';
export const dynamic='force-dynamic';
export default async function Manage(){if(!configured())redirect('/login');const db=await serverClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login');const admin=await db.rpc('is_admin');if(!admin.data)redirect('/login');const data=await loadData();return <Dashboard mode="live" initial={data}/>;}
