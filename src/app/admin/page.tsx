import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import {
  listDocuments,
  listFaqQuestions,
  type DocumentSummary,
  type FaqQuestion,
} from "@/lib/supabase";
import DocumentManager from "./DocumentManager";
import FaqManager from "./FaqManager";

// 저장된 문서는 계속 바뀌므로 접속할 때마다 새로 읽는다.
export const dynamic = "force-dynamic";

// 비밀번호로 막혀 있어도, 이 주소가 검색 결과에 노출될 이유는 없다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  let documents: DocumentSummary[] = [];
  let faqQuestions: FaqQuestion[] = [];
  let loadError = "";

  try {
    [documents, faqQuestions] = await Promise.all([
      listDocuments(),
      listFaqQuestions(),
    ]);
  } catch (error) {
    console.error("관리 화면 데이터 조회 실패:", error);
    loadError = "문서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <div className="flex flex-1 flex-col items-center px-3 py-6 sm:px-10 sm:py-24">
      <div className="surface flex w-full max-w-2xl flex-col gap-8 rounded-2xl p-4 shadow-xl sm:gap-12 sm:rounded-3xl sm:p-14 sm:shadow-2xl">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-sm font-medium text-[var(--accent)] underline underline-offset-4 transition-colors hover:text-[var(--accent-dark)]"
          >
            ← 직원 화면으로
          </Link>
          <div className="w-fit pb-2 sm:pb-5">
            <Image
              src="/logo.png"
              alt="한양대학교병원"
              width={1100}
              height={294}
              priority
              className="h-auto w-[150px] sm:w-[220px]"
            />
          </div>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-[var(--ink-900)] sm:mt-2 sm:text-5xl sm:leading-none">
            복지 문서 관리
          </h1>
          <p className="text-base leading-relaxed text-[var(--ink-700)]">
            총무팀 전용 화면입니다. 여기에 올린 문서를 근거로 직원 질문에
            답변합니다.
          </p>
        </header>

        <DocumentManager initialDocuments={documents} loadError={loadError} />
        <FaqManager initialQuestions={faqQuestions} />
      </div>
    </div>
  );
}
