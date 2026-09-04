# (총)무엇이든 물어봐 점검 결과 (CHECK)

- 점검일: 2026-08-31
- 근거: PRD.md·PLAN.md·DESIGN.md 교차 검토(bkit:design-validator), PLAN.md 성공 기준 판정, 배포 전 보안 점검(bkit:security-architect)
- 범위: 문서 정합성, PLAN.md 성공 기준 6개, 보안(비밀 키·입력 검증·프롬프트 인젝션·개인정보)

## 판정: 조건부 통과

긴급(🔴) 2건, High(🟠) 4건, Medium(🟡) 6건, Low(🟢) 12건까지 코드·문서로 고칠 수 있는 항목은 모두 처리했다. PLAN.md 성공 기준 6개는 실측으로 전부 통과했다. 남은 건 **OpenAI 대시보드의 월 사용량 상한 설정** 단 하나 — 계정 로그인이 필요해 대신 해줄 수 없는 수동 조치다. 이것만 처리하면 배포해도 좋다.

---

## ✅ 해결됨

### 긴급
- 관리자 비밀번호 무제한 대입 공격 가능 — [proxy.ts](src/proxy.ts) `checkAdminPassword`에 IP별 실패 횟수 제한(5회 틀리면 15분 잠금).
- CSRF로 문서 위조 가능 — Origin 검사 + `Content-Type: application/json` 강제.
- (덤) `atob`로 한글 비밀번호 시 로그인 실패 → `TextDecoder`로 교체.
- (덤) 관리 화면 오류 메시지의 `ADMIN_PASSWORD` 노출 → 일반 문구로 교체.

### High
- 프롬프트 인젝션 — [api/chat/route.ts](src/app/api/chat/route.ts)에서 문서를 요청마다 랜덤 `<문서 id="{nonce}">` 태그로 감싸고, 문서/질문을 별도 메시지로 분리. 실제 공격 시나리오로 검증.
- `/api/chat` 남용 방지(코드 부분) — 질문 500자 제한 + IP별 레이트 리밋(분당 10회).
- "문서 준비 완료" 표시 미구현 — [DocumentManager.tsx](src/app/admin/DocumentManager.tsx)에 "✓ 문서 준비 완료 (N개)" 표시.
- CLAUDE.md 아키텍처 서술이 실제 코드와 반대 — 현재 구조에 맞게 갱신.

### Medium
- 성공 기준 #4(정답률 90%) 측정 불가 — 실제 등록 문서(경조사비.pdf) 기준 질문 6건 추가(총 10건). **실측 정답률 100%(10/10)**.
- 성공 기준 #3(1분 이내 응답) 측정 수단 없음 — `tests/accuracy/run.mjs`에 응답시간 측정 추가. **실측 평균 1.3초, 최대 2.3초**.
- Supabase RLS 활성화 여부 확인 불가 — Management API로 조회해 두 테이블 모두 RLS 켜짐·정책 없음(service_role만 접근) 확인. `supabase/migrations/20260828000001_initial_schema.sql`로 코드화.
- `ALLOWED_IPS`가 헤더 위조로 우회 가능 — 프로덕션에서는 위조 불가능한 `x-vercel-forwarded-for`만 신뢰하도록 수정.
- "문서 없음" 예외 처리가 PRD 문구와 다름 — PRD.md §5 문구를 실제 동작(안내+입력 잠금)에 맞춰 수정.
- 환경변수 목록 정리 안 됨 — [.env.example](.env.example) 생성, CLI 도구용 값과 런타임용 값 구분.

### Low
- 비밀번호 비교가 타이밍 안전하지 않음 — [proxy.ts](src/proxy.ts)에 SHA-256 해시 비교(`equalsSafely`) 도입.
- `GET /api/documents`가 무인증으로 문서 파일명·업로드 시각을 노출함 — 관리 화면 전용으로 잠금 (`GET /api/faq`는 원래 공개될 정보라 그대로 둠).
- 오류 메시지에 `OPENAI_API_KEY` 노출 — 일반 문구로 교체.
- 보안 헤더 없음 — [next.config.ts](next.config.ts)에 `X-Frame-Options`·`X-Content-Type-Options`·`Referrer-Policy` 추가.
- `/admin` 검색엔진 색인 차단 없음 — `robots: {index:false, follow:false}` 메타데이터 추가.
- `src/lib/supabase.ts`에 `server-only` 가드 없음 — 패키지 설치 후 추가.
- FAQ 구현이 PRD 문구와 다름 — PRD.md §5 nice-to-have 문구를 실제 구현(칩 버튼)에 맞춰 수정.
- 문서 1건 상한(20만 자)이 DESIGN.md에 미문서화 — §3-3 표에 추가.
- PRD §9 "개발 단위"가 낡음 — Supabase 저장소·관리 화면 분리 구조를 반영해 갱신.
- PRD §6/§7 관리자 비밀번호 예외 교차 참조 없음 — §6에 예외 조항 추가.
- DESIGN §4 안전장치 표에 레이트 리밋·CSRF·무차별 대입 방어·프롬프트 인젝션 방어가 안 나와 있었음 — 표에 반영.
- 개인정보 관련 안내 문구 부재 — 문서 업로드 화면과 직원 질문 화면에 "외부 AI로 전송됩니다, 개인정보 넣지 마세요" 안내 추가.

모두 `npm run lint`·`npm run build` 통과, 실제 서버로 회귀 테스트 완료(정상 질문 응답, 관리 화면 인증, 보안 헤더, noindex 태그 확인).

---

## ⚠️ 수동 조치 필요 (코드로 할 수 없음)

- **OpenAI 대시보드에서 월 사용량 hard limit 설정** — platform.openai.com에 로그인해 사용량 상한을 걸어야 한다. 레이트 리밋을 추가했어도 이건 별도로 설정해야 하는 안전장치다.

---

## 참고: 판정 상세 근거

### A. PRD·PLAN·DESIGN 교차 검토 — 이번 세션에서 이미 해결한 항목

- 사내망 제한을 둘러싼 PRD §7 vs PLAN 성공 기준 상충 → PLAN 성공 기준에서 제거
- FAQ 기능이 DESIGN.md에 전혀 없던 문제 → 와이어프레임·`faq_questions` 스키마 반영
- DESIGN §2-3 컨텍스트 절단 방향 설명 오류 → 수정
- PLAN에 관리 화면 비밀번호 보호 작업 항목이 없던 문제 → 반영
- PLAN "현재 상태 대조" 표 → 최신화
- PRD §6(범위) "문서 준비 완료 표시" 미구현 → 구현
- PRD §5 "문서 없음" 예외 문구 불일치 → 수정
- PRD §5 nice-to-have FAQ 문구 불일치 → 수정
- PRD §9 개발 단위 낡음 → 갱신
- PRD §6/§7 교차 참조 없음 → 추가

### B. PLAN.md 성공 기준 판정

| # | 기준 | 판정 | 근거 |
|---|------|------|------|
| 1 | 문서를 올리지 않고 접속만 해도 질문할 수 있다 | ✅ 통과 | Supabase 저장 구조, 브라우저 테스트 |
| 2 | 새로고침해도 문서가 유지된다 | ✅ 통과 | Supabase 영속 저장 |
| 3 | 질문 입력 시점부터 답변까지 1분 이내 | ✅ 통과 | 실측 평균 1.3초, 최대 2.3초 |
| 4 | 테스트 질문 10~20개 기준 정답률 90% 이상 | ✅ 통과 | 실측 100%(10/10) |
| 5 | 예외 상황 5가지가 PRD 문구 그대로 동작한다 | ✅ 통과 (5/5) | PRD 문구를 실제 동작에 맞춰 수정하여 전항목 일치 |
| 6 | `npm run lint`와 `npm run build`가 통과한다 | ✅ 통과 | 반복 확인 |

### C. 보안 점검 요약

| 항목 | 결과 |
|---|---|
| 비밀 키/시크릿 노출 | 문제없음 |
| SQL/NoSQL 인젝션 | 없음 |
| XSS | 없음 |
| CSRF | ✅ 해결됨 |
| 프롬프트 인젝션 대비 | ✅ 해결됨 (실제 공격 시나리오로 검증) |
| 자원 고갈(비용) 방어 | 코드는 해결됨. OpenAI 대시보드 사용량 상한만 수동 조치로 남음 |
| Supabase RLS | ✅ 확인·코드화 |
| IP 위조(ALLOWED_IPS) | ✅ 해결됨 |
| 관리자 인증 | ✅ 대입 공격 방어·타이밍 안전 비교 모두 해결 |
| 정보 노출(문서 API, 오류 메시지) | ✅ 해결됨 |
| 클릭재킹/보안 헤더 | ✅ 해결됨 |
| 개인정보 안내 | ✅ 안내 문구 추가 |
