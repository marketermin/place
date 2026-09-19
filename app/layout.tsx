import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'플레이스 데이즈 | 순위 관리',description:'상위 5위, 누적 25일까지. 업장별 플레이스 순위 기록.',robots:{index:false,follow:false},icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="ko"><body>{children}</body></html>;}
