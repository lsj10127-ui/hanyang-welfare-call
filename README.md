# (총)무엇이든 물어봐

한양대학교병원 총무팀을 위한 사내 복지 안내 챗봇입니다. 총무팀이 올려둔 PDF 문서를 근거로, 직원이 결혼·출산·경조사비 같은 복지 제도를 물어보면 문서 내용 그대로 답변합니다.

## 주요 기능

- **직원 화면(`/`)** — 로그인 없이 누구나 접속해 복지 제도를 질문할 수 있습니다. 자주 묻는 질문을 카테고리별 버튼으로 골라 바로 물어볼 수도 있습니다.
- **관리 화면(`/admin`)** — 총무팀 전용(비밀번호 보호). PDF 문서 업로드·교체·삭제, 자주 묻는 질문(FAQ) 등록·삭제를 할 수 있습니다.
- **문서 기반 답변** — 답변은 총무팀이 올린 문서 내용에서만 근거를 찾습니다. 문서에 없는 내용은 "문서에 없습니다."라고만 답하고, 복지와 무관한 질문은 거절합니다.
- **보안** — 관리자 비밀번호 무차별 대입 방어, CSRF 방어, 질문 API 레이트 리밋, 프롬프트 인젝션 방어(문서와 질문을 분리해 전달)를 갖추고 있습니다.

## 기술 스택

- [Next.js](https://nextjs.org) (App Router) + TypeScript
- [Supabase](https://supabase.com) — 문서·FAQ 저장 (Postgres, RLS 적용)
- [OpenAI API](https://platform.openai.com) (`gpt-4o-mini`) — 답변 생성
- [pdfjs-dist](https://mozilla.github.io/pdf.js/) — 브라우저에서 PDF 텍스트 추출
- Tailwind CSS

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

### 환경변수

`.env.example`을 참고해 `.env` 파일을 만듭니다. 앱 실행에 필요한 값은 다음과 같습니다.

| 변수 | 설명 |
|---|---|
| `OPENAI_API_KEY` | 답변 생성에 사용하는 OpenAI API 키 |
| `SUPABASE_URL` | Supabase 프로젝트 주소 |
| `SUPABASE_SECRET_KEY` | Supabase service_role 키 (서버 전용, 브라우저에 노출 금지) |
| `ADMIN_PASSWORD` | 관리 화면(`/admin`) 비밀번호 |
| `ALLOWED_IPS` | (선택) 사내망 IP 제한, 비워두면 비활성화 |

## 명령어

```bash
npm run dev            # 개발 서버
npm run build           # 프로덕션 빌드
npm run lint            # ESLint
npm run test:accuracy   # 문서 기반 정답률 측정 (개발 서버가 떠 있어야 함)
```

## 문서

프로젝트 기획·설계 배경은 각 문서를 참고하세요.

- `PRD.md` — 서비스 기획서 (요구사항, 예외 처리 규칙, 비목표)
- `DESIGN.md` — 설계서 (화면 구성, 데이터 흐름)
- `PLAN.md` — 구현 계획 및 진행 상태
- `CHECK.md` — 배포 전 점검 결과
