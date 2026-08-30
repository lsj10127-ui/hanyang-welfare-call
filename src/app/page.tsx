import Image from "next/image";
import Link from "next/link";
import { listDocuments, listFaqQuestions } from "@/lib/supabase";
import ChatPanel from "./ChatPanel";

// 총무팀이 문서를 올리면 바로 반영되어야 하므로 접속할 때마다 새로 읽는다.
export const dynamic = "force-dynamic";

export default async function Home() {
  let documentCount = 0;
  let faqQuestions: string[] = [];
  try {
    const [documents, faq] = await Promise.all([
      listDocuments(),
      listFaqQuestions(),
    ]);
    documentCount = documents.length;
    faqQuestions = faq.map((item) => item.question);
  } catch (error) {
    // 못 읽어도 화면은 떠야 한다. 이 경우 "문서 없음"과 같은 안내가 나간다.
    console.error("문서 또는 자주 묻는 질문 조회 실패:", error);
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:px-10 sm:py-24">
      <div className="flex w-full max-w-2xl flex-col gap-12">
        <header className="flex flex-col gap-4">
          {/* 남색 밑줄로 병원 로고와 제목을 묶는다. */}
          <div className="w-fit border-b-2 border-[var(--navy)] pb-5">
            <Image
              src="/logo.png"
              alt="한양대학교병원"
              width={1100}
              height={294}
              priority
              className="h-auto w-[200px] sm:w-[260px]"
            />
          </div>
          <div className="mt-2 flex items-center gap-4">
            {/* 물어보면 답해 주는 서비스라는 뜻을 담은 말풍선 표시 */}
            <svg
              viewBox="0 0 48 48"
              className="h-12 w-12 shrink-0 sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              {/* 각진 말풍선 — 화면 전체의 직각 형태와 맞춘다 */}
              <path d="M2 4h44v30H22L10 46V34H2z" fill="var(--navy)" />
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
            <h1 className="text-4xl font-black leading-none tracking-tight text-[var(--ink-900)] sm:text-6xl">
              한양복지콜
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
        </header>

        <ChatPanel documentCount={documentCount} faqQuestions={faqQuestions} />

        <footer className="border-t-2 border-[var(--navy)] pt-6">
          <Link
            href="/admin"
            className="text-sm font-medium text-[var(--navy)] underline underline-offset-4 transition-colors hover:text-[var(--navy-dark)]"
          >
            총무팀 문서 관리
          </Link>
        </footer>
      </div>
    </div>
  );
}
