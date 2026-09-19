import Signup from '@/components/signup';
import {configured} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default function Page(){return <Signup configured={configured()}/>;}
