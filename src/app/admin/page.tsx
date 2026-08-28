import Link from "next/link";
import { listDocuments, type DocumentSummary } from "@/lib/supabase";
import DocumentManager from "./DocumentManager";

// 저장된 문서는 계속 바뀌므로 접속할 때마다 새로 읽는다.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let documents: DocumentSummary[];
  let loadError = "";

  try {
    documents = await listDocuments();
  } catch (error) {
    console.error("문서 목록 조회 실패:", error);
    documents = [];
    loadError = "문서 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[var(--background)] px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-[var(--brand-600)] hover:text-[var(--brand-700)]"
          >
            ← 직원 화면으로
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-[var(--brand-900)] sm:text-3xl">
            복지 문서 관리
          </h1>
          <p className="mt-2 text-sm text-[var(--brand-700)] sm:text-base">
            총무팀 전용 화면입니다. 여기에 올린 문서를 근거로 직원 질문에
            답변합니다.
          </p>
        </div>

        <DocumentManager initialDocuments={documents} loadError={loadError} />
      </div>
    </div>
  );
}
