import Image from "next/image";
import Link from "next/link";
import { listDocuments, listFaqQuestions, type FaqQuestion } from "@/lib/supabase";
import ChatPanel from "./ChatPanel";

// 총무팀이 문서를 올리면 바로 반영되어야 하므로 접속할 때마다 새로 읽는다.
export const dynamic = "force-dynamic";

export default async function Home() {
  let documentCount = 0;
  let faqQuestions: FaqQuestion[] = [];
  try {
    const [documents, faq] = await Promise.all([
      listDocuments(),
      listFaqQuestions(),
    ]);
    documentCount = documents.length;
    faqQuestions = faq;
  } catch (error) {
    // 못 읽어도 화면은 떠야 한다. 이 경우 "문서 없음"과 같은 안내가 나간다.
    console.error("문서 또는 자주 묻는 질문 조회 실패:", error);
  }

  return (
    <div className="flex flex-1 flex-col items-center px-3 py-6 sm:px-10 sm:py-24">
      <div className="surface flex w-full max-w-6xl items-start justify-center gap-8 rounded-2xl p-4 shadow-xl sm:gap-12 sm:rounded-3xl sm:p-14 sm:shadow-2xl">
        <div className="flex w-full max-w-2xl flex-col gap-8 sm:gap-12">
          <header className="flex flex-col gap-4">
            <div className="w-fit pb-2 sm:pb-5">
              <Image
                src="/logo.png"
                alt="한양대학교병원"
                width={1100}
                height={294}
                priority
                className="h-auto w-[160px] sm:w-[260px]"
              />
            </div>
            <div className="mt-1 flex items-center gap-3 sm:mt-2 sm:gap-4">
              {/* 물어보면 답해 주는 서비스라는 뜻을 담은 둥근 말풍선 표시 */}
              <svg
                viewBox="0 0 48 48"
                className="h-10 w-10 shrink-0 sm:h-16 sm:w-16"
                aria-hidden="true"
              >
                <path
                  d="M6 6h36a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H22L10 46V36H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"
                  fill="var(--accent)"
                />
                {/* 물음표 */}
                <path
                  d="M18 15.5a6 6 0 1 1 6 6v2.5"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                />
                <circle cx="24" cy="28.5" r="2.1" fill="#ffffff" />
              </svg>
              <h1 className="text-2xl font-semibold leading-tight tracking-tight text-[var(--ink-900)] sm:text-6xl sm:leading-none">
                (총)무엇이든 물어봐
              </h1>
            </div>
            <p className="max-w-lg text-base leading-relaxed text-[var(--ink-700)] sm:text-lg">
              복지 제도에 대해 궁금한 점을 물어보세요.
              <br />
              총무팀이 등록한 문서를 근거로 답변해 드립니다.
            </p>
            {documentCount > 0 && (
              <p className="text-sm font-medium text-[var(--ink-500)]">
                안내 가능한 문서 {documentCount}개
              </p>
            )}
            <p className="text-xs leading-relaxed text-[var(--ink-500)]">
              ※ 질문은 답변 생성을 위해 외부 AI 서비스로 전송됩니다. 개인정보는
              입력하지 마세요.
            </p>
          </header>

          <ChatPanel documentCount={documentCount} faqQuestions={faqQuestions} />

          <footer className="section-dark rounded-xl px-4 py-3 sm:rounded-2xl sm:px-6 sm:py-4">
            <Link
              href="/admin"
              className="text-sm font-medium text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-dark)]"
            >
              총무팀 문서 관리
            </Link>
          </footer>
        </div>

        {/* 무엇이든 물어보라는 안내 캐릭터. 좁은 화면에서는 자리를 차지하지 않도록 감춘다. */}
        <aside className="sticky top-16 hidden w-72 shrink-0 flex-col items-center gap-4 lg:flex">
          {/* 평소엔 손에 든 물음표 팻말이, 마우스를 올리면 입에 문 모습으로 자리를 옮긴다. */}
          <div className="leo-wrap relative w-56">
            <Image
              src="/leo.png"
              alt="(총)무엇이든 물어봐 마스코트 레오"
              width={1588}
              height={1589}
              className="h-auto w-56"
            />
            <div className="leo-sign absolute h-10 w-10" aria-hidden="true">
              <svg viewBox="0 0 60 60" className="h-full w-full drop-shadow">
                <circle cx="30" cy="30" r="27" fill="#0071e3" stroke="#ffffff" strokeWidth="3" />
                <text
                  x="30"
                  y="41"
                  fontSize="32"
                  fontWeight="700"
                  fill="#ffffff"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  ?
                </text>
              </svg>
            </div>
          </div>
          <div className="rounded-2xl bg-[var(--ink-50)] px-5 py-4 text-center shadow-sm">
            <p className="text-sm font-semibold text-[var(--ink-900)]">
              레오에게 무엇이든 물어보세요
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-500)]">
              (총)무엇이든 물어봐가 문서를 근거로
              <br />
              바로 답해 드려요
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
