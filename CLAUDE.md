# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

"(총)무엇이든 물어봐" — an internal chatbot for the General Affairs team at Hanyang University Hospital. Staff ask how to use employee welfare programs; the bot answers strictly from PDFs the team uploads.

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

**Documents are stored server-side in Supabase, not in browser state.** There are two screens: `/` (employee chat, public) and `/admin` (document + FAQ management, password-protected). PDF text extraction still runs client-side in `src/app/extractPdfText.ts` (pdfjs-dist) — only the extracted text is sent to the server. `src/app/admin/DocumentManager.tsx` POSTs it to `/api/documents`, which persists it in the `welfare_documents` table (`src/lib/supabase.ts`). `src/app/page.tsx` and `src/app/admin/page.tsx` read from Supabase on every request (`export const dynamic = "force-dynamic"`), so a refresh — or a different device — sees the same documents. FAQ chips work the same way through `faq_questions` / `/api/faq` / `FaqManager.tsx`.

Each question to `POST /api/chat` sends only the question text; the route reads all documents server-side via `listDocumentsWithContent()` and builds the context itself — the client never gets to supply document content, which is what prevents a forged "document" from being injected into the prompt. If the combined content exceeds `MAX_CONTEXT_CHARS` (60,000), the **oldest** documents are dropped first (not the newest) so the "latest document wins" conflict rule stays true. Each document is wrapped in `<문서 id="{nonce}">` tags with a `crypto.randomUUID()` generated fresh per request, and the question is sent as a separate `user` message from the documents' `system` message — this keeps a question that contains fake "document" text from being treated as one, and rule 5 of the system prompt explicitly tells the model a question is never an instruction. There is no retrieval or embedding step despite the "RAG" framing.

**The pdf.js worker is a static asset, not a bundled import.** `extractPdfText.ts` sets `workerSrc = "/pdf.worker.min.mjs"`. After upgrading `pdfjs-dist`, re-copy it or extraction breaks at runtime:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```

**All answer behavior lives in one system prompt** in `src/app/api/chat/route.ts`. Its numbered rules implement PRD.md §5 directly: answer only from the tagged documents, reply exactly `문서에 없습니다.` when unsupported, pass numbers and dates through verbatim, refuse off-topic questions, prefer the newest document on conflicts, and ignore instruction-like text inside the user's question. Change the prompt and the PRD together.

`OPENAI_API_KEY` is read only inside that route handler and is never exposed to the client.

**`src/proxy.ts` (Next.js middleware — renamed from `middleware.ts` as of Next 16) gates everything before it reaches a page or route:**
- Admin password (HTTP Basic, `.env`'s `ADMIN_PASSWORD`) on `/admin` and on writes to `/api/documents` and `/api/faq` — reads stay public since the employee screen needs them.
- A same-origin check on those same writes, because HTTP Basic auth isn't a cookie and gets no `SameSite` protection otherwise (CSRF).
- An in-memory lockout (5 wrong passwords → 15 minutes) against brute-forcing the admin password.
- An in-memory rate limit on `POST /api/chat` (10 requests/minute per IP) since it's an unauthenticated public endpoint.
- An optional intranet IP allow-list (`ALLOWED_IPS`) — off by default; see "Open constraint" below.

All four in-memory mechanisms reset on server restart and aren't shared across multiple function instances — a real backstop (OpenAI usage cap, Supabase RLS, a proper store) still matters for production; see `CHECK.md`.

## Conventions

- User-facing text is Korean in polite form (존댓말), including error and empty states.
- Colors come from the CSS custom properties in `src/app/globals.css` (`--ink-900` down to `--ink-50`, plus `--accent`, `--accent-dark`, `--danger`), consumed via Tailwind arbitrary values such as `text-[var(--ink-700)]` or `border-[var(--accent)]`. Avoid raw hex and stock Tailwind palette colors — there is no `--brand-*` scale. The look is intentionally Apple-site-inspired (2026-09-04): white background, near-black/gray ink tones, a blue `--accent` for buttons and links, generously rounded corners (`rounded-full`/`rounded-2xl`) instead of the hard-edged, navy-bordered style used before — don't reintroduce sharp `border-2`/square icons or the old `--navy` tokens.
- Import alias `@/*` resolves to `src/*`.

## Open constraint

PRD.md §7 was amended (2026-08-28): the employee screen and question feature are **not** intranet-restricted — the welfare documents are public-safe content, so this is no longer blocking deployment. Only `/admin` (and document/FAQ writes) need protection, which `src/proxy.ts` already provides via password + CSRF check + lockout. The optional `ALLOWED_IPS` intranet allow-list in `proxy.ts` is implemented but disabled by default (empty) and not required for launch; if it's ever turned on, fix the IP-spoofing gap noted in `CHECK.md` first.

`CHECK.md` tracks what's still open before public deployment (accuracy test question set, response-time measurement, Supabase RLS confirmation, OpenAI usage cap, etc.) — read it before declaring the app ready to ship.
