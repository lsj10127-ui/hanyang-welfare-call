# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"한양복지콜" — an internal chatbot for the General Affairs team at Hanyang University Hospital. Staff ask how to use employee welfare programs; the bot answers strictly from PDFs the team uploads.

`PRD.md` is the product spec and the source of truth for behavior. Read it before changing what the bot says or widening scope — it fixes the two must-have features, the exception-handling rules, and an explicit non-goals list (no auth, no application submission, no personal-data lookup, no mobile app, no i18n).

## 작업 규칙

**언어**
- 모든 설명과 코드 주석은 한국어로 작성한다.

**작업 범위**
- 새 파일은 `my-app` 폴더 안에만 만든다.
- 기술 스택은 PRD에 정한 대로 Next.js로 고정한다. 다른 프레임워크로 바꾸거나 마이그레이션을 제안하지 않는다.
- 배포는 Vercel을 사용한다.

**변경 보고**
- 코드를 바꾸면 무엇을 왜 바꿨는지 반드시 한 줄로 알려준다.

**비밀 정보**
- `.env` 등 비밀 정보 파일과 `node_modules`는 `.gitignore`에 등록된 상태를 유지하고, 절대 커밋하지 않는다.
- 외부 서비스 인증이 필요하면 토큰 값을 사용자에게 묻거나 채팅에 출력하지 않는다. `.env`에 있는 값을 읽어서 사용한다.
  - Supabase 작업: Supabase CLI를 설치해 `.env`의 `SUPABASE_ACCESS_TOKEN`으로 인증한다.
  - Vercel 작업(배포 등): Vercel CLI를 설치해 `.env`의 `VERCEL_TOKEN`으로 인증한다.

**파일 삭제**
- 파일을 지워야 할 때는 바로 삭제하지 않는다. `trash-can/` 폴더를 만들어 그 안으로 옮겨만 둔다. 최종 삭제는 사용자가 직접 확인 후 처리한다. (`trash-can/`은 `.gitignore`에 등록되어 있다.)

**서브에이전트**
- 이미 설치된 서브에이전트는 필요할 때마다 적극 활용한다.

## Commands

```bash
npm run dev     # dev server, http://localhost:3000
npm run build   # production build
npm run lint    # eslint
```

No test framework is configured.

## 작업 절차 (검증 루프)

코드를 건드릴 때마다 아래를 반복한다. 통과할 때까지 루프를 빠져나오지 않는다.

1. **변경한다.**
2. **`npm run lint`와 `npm run build`를 실행해 오류가 없는지 확인한다.**
3. **화면이 바뀐 작업이면 `npm run dev`로 띄워 실제로 보이는지 확인한다.** (화면과 무관한 변경이면 건너뛴다.)
4. **문제가 있으면 고치고 1)로 돌아간다.**
5. **통과하면 무엇을 왜 바꿨는지 한 줄로 요약해 알려준다.**

검증을 건너뛰고 "완료했다"고 보고하지 않는다. 오류가 남아 있으면 남아 있다고 그대로 말한다.

## Architecture

**Documents never leave the browser until a question is asked.** PDF text extraction runs client-side in `src/app/extractPdfText.ts` (pdfjs-dist). The extracted text is held only in React state in `src/app/page.tsx` — there is no database, no upload endpoint, and no server-side persistence. A page refresh drops every loaded document.

Each question POSTs the full text of *all* loaded documents to `POST /api/chat`, which truncates at `MAX_CONTEXT_CHARS` (60,000) before calling OpenAI `gpt-4o-mini`. Context is rebuilt per request; there is no retrieval or embedding step despite the "RAG" framing. Document order matters — the route treats the last document as the most recently uploaded, which the prompt uses to resolve conflicts between documents.

**The pdf.js worker is a static asset, not a bundled import.** `extractPdfText.ts` sets `workerSrc = "/pdf.worker.min.mjs"`. After upgrading `pdfjs-dist`, re-copy it or extraction breaks at runtime:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

**All answer behavior lives in one system prompt** in `src/app/api/chat/route.ts`. Its numbered rules implement PRD.md §5 directly: answer only from the documents, reply exactly `문서에 없습니다.` when unsupported, pass numbers and dates through verbatim, refuse off-topic questions, and prefer the newest document on conflicts. Change the prompt and the PRD together.

`OPENAI_API_KEY` is read only inside that route handler and is never exposed to the client.

## Conventions

- User-facing text is Korean in polite form (존댓말), including error and empty states.
- Colors come from the CSS custom properties in `src/app/globals.css` (`--brand-50` through `--brand-900`), consumed via Tailwind arbitrary values such as `text-[var(--brand-700)]`. Avoid raw hex and stock Tailwind palette colors.
- Import alias `@/*` resolves to `src/*`.

## Open constraint

PRD.md §7 requires intranet-only access, and nothing enforces it yet. Vercel's IP allowlist (Trusted IPs) is Enterprise-only, so deployment is on hold pending either a Next.js middleware IP check or another approach. Raise this before deploying to a public URL.
