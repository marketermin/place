import Login from '@/components/login';
import {configured} from '@/lib/supabase';
import Link from 'next/link';
export const dynamic='force-dynamic';
export default function Page(){return <><Login configured={configured()}/><div className="login-switch">처음 이용하시나요? <Link href="/signup">관리자 회원가입</Link></div></>;}
