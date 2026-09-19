# 플레이스 데이즈

네이버 플레이스 업장·검색어별 수동 순위 기록 서비스입니다. Next.js + Supabase로 구성했고 Vercel로 옮길 수 있습니다.

## 지금 열기

서버가 실행 중이라면 [로컬 데모](http://localhost:3000/demo)를 여세요.

- 데모 업장과 기록은 가상입니다.
- 데모에서 입력한 내용은 이 브라우저에만 저장됩니다. 다른 브라우저나 기기와 공유하지 않습니다.
- 실제 관리자 화면은 `/manage`, 로그인은 `/login`입니다.
- Supabase 연결 전에는 실제 관리자 로그인을 사용할 수 없습니다. 데모에 실제 개인정보나 비밀을 입력하지 마세요.
- 브라우저 데이터를 지우면 데모 기록도 지워집니다. 자동 수집·이메일 발송은 없습니다.

## 다시 실행하기

이 폴더의 `로컬실행.command`를 더블클릭하세요. 열린 창은 사이트를 이용하는 동안 닫지 마세요. macOS에서 실행이 차단되면 터미널에서 아래 명령을 사용하세요.

일반적인 Node.js 22 이상 환경에서는 이 폴더에서:

```sh
npm install
npm run dev
```

그다음 http://localhost:3000/demo 를 엽니다. 로컬 주소는 실행 중인 이 컴퓨터에서만 사용할 수 있습니다. 모바일 화면 구성은 제공하지만 다른 휴대폰에서 이 주소로 연결되지는 않습니다.

## 실제 저장을 위한 첫 작업

지금 필요한 가입은 Supabase 하나입니다. [Supabase](https://supabase.com/dashboard)에서 가입하고 새 프로젝트를 만드세요. 프로젝트가 준비되면 다음 연결 작업을 진행할 수 있습니다. 비밀번호나 비밀키를 대화에 붙여 넣지 마세요.

아래는 연결할 때 사용할 순서입니다. 데모만 볼 때는 필요하지 않습니다.

1. Supabase의 SQL Editor에서 `supabase/001_initial.sql` 내용을 **새 프로젝트에 한 번** 실행합니다.
2. Authentication → Users에서 관리자 이메일과 비밀번호로 사용자를 만듭니다. 이메일 확인 상태도 설정합니다. 일반 가입 허용 옵션은 끕니다. 화면에는 회원가입 기능이 없습니다.
3. 생성한 사용자 ID를 아래 SQL에 넣고 SQL Editor에서 실행합니다. 등록된 관리자도 자신이 만든 업장만 볼 수 있습니다.

```sql
insert into public.admins(user_id) values ('관리자 사용자 ID');
```

4. 프로젝트의 연결 정보에서 Project URL과 **publishable key**를 확인합니다. `.env.example`을 참고해 `.env.local`에 해당 두 값만 넣습니다. publishable key는 공개 사용을 위한 키이며 권한 보호는 DB 정책이 담당합니다. `service_role`, secret key, DB 비밀번호는 넣지 않습니다.
5. 실행 중인 창에서 Ctrl+C로 중지한 뒤 다시 실행합니다. `/login`에서 관리자 이메일과 비밀번호로 로그인합니다.
6. 실제 업장 하나와 기록 하나를 저장하고 로그아웃·다시 로그인해 유지되는지 확인합니다. 이 실서비스 연결 검증은 사용자 프로젝트가 연결된 후에 완료할 수 있습니다.

## Gemini 2.5 Flash에 대해

Gemini 2.5 Flash는 이 서비스에서 **저장된 순위 기록을 한국어로 요약하는 보조 기능**으로만 연결할 수 있습니다. Gemini에게 네이버 검색 결과를 보여주지 않고 “오늘 몇 위일 것 같다”고 묻게 하면 실제 측정이 아니므로 사용하지 않습니다. 현재 자동 수집 목적이라면 Gemini 키만 넣어도 자동 확인은 시작되지 않습니다.

Google AI Studio에서 API 키를 만든 뒤 `.env.local`에 `GEMINI_API_KEY=...`를 넣고, 모델은 `GEMINI_MODEL=gemini-2.5-flash`로 둘 수 있습니다. 이 키는 `NEXT_PUBLIC_`를 붙이면 안 됩니다. 현재 코드의 `/api/gemini/summary`는 관리자 로그인 뒤 사실 요약만 허용하고, 키는 서버에서만 읽습니다. Gemini의 공식 API는 `x-goog-api-key` 헤더를 쓰며 `gemini-2.5-flash`는 현재 종료일이 공지되지 않은 안정 모델입니다. 무료 사용량과 유료 단가는 Google의 현재 가격표를 확인하세요. [API 인증](https://ai.google.dev/gemini-api/docs/get-started), [모델 종료 일정](https://ai.google.dev/gemini-api/docs/deprecations), [가격](https://ai.google.dev/gemini-api/docs/pricing)

## 매일 네이버 순위를 자동 확인하려면

네이버 공식 검색 API는 플레이스 화면의 위치·광고 기준과 다르고, 공식 안내와 약관상 결과를 추출해 저장하는 용도로 사용할 수 없습니다. [네이버 약관](https://developers.naver.com/products/intro/terms/terms.md)과 [저장·가공 안내](https://help.naver.com/service/30015/contents/17128?lang=ko&osType=COMMONOS)를 확인했습니다. 따라서 Gemini를 중간에 넣어 자동 순위를 만들지 않았습니다.

실제로 켜려면 먼저 순위 공급자에게 ① 네이버 플레이스 결과 수집 권한 ② 일별 순위 장기 저장 권한 ③ 검색 위치·기기·광고 제외 기준 ④ 0/미확인/실패의 구분 ⑤ API 이용 약관과 장애 정책을 확인해야 합니다. 확인된 뒤 `RANK_PROVIDER_ENABLED=true`, `RANK_PROVIDER_BASE_URL`, `RANK_PROVIDER_API_KEY`를 서버 환경변수에 넣고, 하루 한 번 실행되는 서버 작업과 중복 방지·재시도·근거 URL 저장을 추가합니다. 현재는 이 값을 넣어도 자동 수집이 실행되지 않게 막아두었습니다.

## Vercel로 옮길 때

로컬 사용에는 Vercel 가입이 필요 없습니다. 공개 주소가 필요해지면 그때 가입하면 됩니다.

- 이 폴더를 비공개 Git 저장소에 올린 뒤 Vercel에서 해당 프로젝트를 가져옵니다. `.env.local`과 `node_modules`는 올리지 않습니다.
- Next.js 자동 감지를 사용합니다. lockfile을 함께 올립니다.
- Vercel 설정에 `.env.example`의 두 환경 변수를 입력합니다. Supabase 관리자 비밀키는 불필요합니다.
- Supabase의 Site URL을 배포 주소로 지정합니다. 일반 회원가입은 계속 비활성화합니다.
- 배포 후 실제 관리자 로그인·저장·로그아웃 접근 차단을 다시 확인합니다.

## 계산과 알림

- 업장×검색어마다 관리 시작일부터 한국 시간 오늘까지의 1~5위 날짜를 누적합니다.
- 6위 이하, 미확인, 시작일 이전 날짜는 제외됩니다. 미래 기록은 막습니다.
- 같은 검색어·날짜는 DB의 고유 규칙과 덮어쓰기로 중복을 막습니다.
- 20~25일의 각 단계별 알림을 한 개씩 유지합니다. 25일 뒤에도 초기화하지 않습니다.
- 과거 수정으로 도달하지 못하게 된 알림은 제거합니다. 도달 날짜가 바뀐 알림은 읽지 않음으로 되돌립니다. 여전히 유효한 이전 단계 알림은 이력으로 유지합니다.
- 업장 시작일 수정도 재계산합니다. 검색어 제거·이름 변경은 해당 검색어 기록과 알림을 삭제하므로 화면에서 안내합니다.

## 개발 점검

```sh
npm run test
npm run typecheck
npm run build
```

`tests/database.test.ts`는 PostgreSQL 실행 환경인 PGlite에서 실제 마이그레이션과 저장 함수를 실행하고 데이터 접근 제한을 시험합니다. 외부 Supabase의 로그인 서버를 대신 검증하는 것은 아닙니다.

자동 수집 조사와 미확인 항목은 `RESEARCH.md`, 실제 실행한 검증 결과는 `VERIFICATION.md`에 정리합니다.
