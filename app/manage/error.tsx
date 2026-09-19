'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="login-page"><section className="login-card"><h1>기록을 불러오지 못했습니다</h1><p>인터넷 연결과 Supabase 설정을 확인한 뒤 다시 시도해 주세요.</p><button onClick={reset}>다시 시도</button><a href="/login">로그인 화면</a></section></main>;}
