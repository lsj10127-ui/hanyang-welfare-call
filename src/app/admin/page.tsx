import Image from "next/image";
import Link from "next/link";
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
    <div className="flex flex-1 flex-col items-center px-6 py-16 sm:px-10 sm:py-24">
      <div className="flex w-full max-w-2xl flex-col gap-12">
        <header className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-sm font-medium text-[var(--navy)] underline underline-offset-4 transition-colors hover:text-[var(--navy-dark)]"
          >
            ← 직원 화면으로
          </Link>
          <div className="w-fit border-b-2 border-[var(--navy)] pb-5">
            <Image
              src="/logo.png"
              alt="한양대학교병원"
              width={1100}
              height={294}
              priority
              className="h-auto w-[180px] sm:w-[220px]"
            />
          </div>
          <h1 className="mt-2 text-4xl font-black leading-none tracking-tight text-[var(--ink-900)] sm:text-5xl">
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
