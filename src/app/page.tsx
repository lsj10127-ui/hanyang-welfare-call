import Link from "next/link";
import { listDocuments } from "@/lib/supabase";
import ChatPanel from "./ChatPanel";

// 총무팀이 문서를 올리면 바로 반영되어야 하므로 접속할 때마다 새로 읽는다.
export const dynamic = "force-dynamic";

export default async function Home() {
  let documentCount = 0;
  try {
    documentCount = (await listDocuments()).length;
  } catch (error) {
    // 문서를 못 읽어도 화면은 떠야 한다. 이 경우 "문서 없음"과 같은 안내가 나간다.
    console.error("문서 목록 조회 실패:", error);
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[var(--background)] px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-[var(--brand-900)] sm:text-3xl">
            한양복지콜
          </h1>
          <p className="mt-2 text-sm text-[var(--brand-700)] sm:text-base">
            직원 복지 제도에 대해 궁금한 점을 물어보세요. 총무팀이 등록한 문서를
            근거로 답변해 드립니다.
          </p>
          {documentCount > 0 && (
            <p className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-1.5 text-sm font-semibold text-[var(--brand-700)]">
              ✓ 안내 가능한 문서 {documentCount}개
            </p>
          )}
        </div>

        <ChatPanel documentCount={documentCount} />

        <Link
          href="/admin"
          className="text-center text-xs text-[var(--brand-500)] hover:text-[var(--brand-700)] sm:text-left"
        >
          총무팀 문서 관리
        </Link>
      </div>
    </div>
  );
}
