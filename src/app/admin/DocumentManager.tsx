"use client";

import { useRef, useState } from "react";
import { extractPdfText } from "../extractPdfText";
import type { DocumentSummary } from "@/lib/supabase";

interface Props {
  /** 서버에서 미리 읽어온 문서 목록 */
  initialDocuments: DocumentSummary[];
  /** 서버에서 목록을 못 읽었을 때의 안내 문구 */
  loadError: string;
}

export default function DocumentManager({ initialDocuments, loadError }: Props) {
  const [documents, setDocuments] = useState<DocumentSummary[]>(initialDocuments);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>(loadError ? [loadError] : []);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function refreshDocuments() {
    const res = await fetch("/api/documents");
    const data = await res.json();
    if (res.ok) setDocuments(data.documents);
  }

  async function handleDelete(doc: DocumentSummary) {
    const ok = window.confirm(
      `"${doc.name}" 문서를 삭제할까요?\n\n삭제하면 이 문서 내용으로는 더 이상 답변하지 않습니다.`
    );
    if (!ok) return;

    setDeletingId(doc.id);
    setErrors([]);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrors([data.error ?? "문서를 삭제하지 못했습니다."]);
      }
      await refreshDocuments();
    } catch {
      setErrors(["문서를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요."]);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList).filter(
      (file) => file.type === "application/pdf"
    );
    if (files.length === 0) return;

    setIsUploading(true);
    setErrors([]);
    setUploadSuccessMessage("");
    const failed: string[] = [];
    let savedCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress(`${file.name} 처리 중... (${i + 1}/${files.length})`);

        // PDF에서 글자를 뽑는 일은 브라우저에서 끝내고, 서버로는 텍스트만 보낸다.
        let text = "";
        try {
          text = await extractPdfText(file);
        } catch {
          failed.push(`${file.name}: 파일을 읽는 중 문제가 발생했습니다.`);
          continue;
        }

        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, content: text }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          failed.push(`${file.name}: ${data.error ?? "저장하지 못했습니다."}`);
        } else {
          savedCount += 1;
        }
      }

      setErrors(failed);
      // 몇 건이라도 저장에 성공했으면 "문서 준비 완료"를 알려 준다. (PRD §9 개발 단위 1)
      if (savedCount > 0) {
        setUploadSuccessMessage(`✓ 문서 준비 완료 (${savedCount}개 등록함)`);
      }
      await refreshDocuments();
    } catch {
      setErrors([...failed, "문서를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."]);
    } finally {
      setIsUploading(false);
      setProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <>
      {/* 업로드 */}
      <section className="flex flex-col gap-4">
        <label
          htmlFor="pdf-upload"
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[var(--ink-300)] bg-[var(--ink-50)] px-6 py-14 text-center transition-colors hover:border-[var(--accent)] hover:bg-[var(--background)]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-7 w-7 text-[var(--accent)]"
          >
            <path d="M12 16V4M12 4 7 9M12 4l5 5" />
            <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
          </svg>
          <span className="text-base font-semibold text-[var(--ink-900)]">
            복지 문서(PDF) 올리기
          </span>
          <span className="text-sm leading-relaxed text-[var(--ink-500)]">
            여러 개를 한 번에 선택할 수 있습니다. 제도별로 나누어 올리면 답변이
            더 정확해집니다.
            <br />
            같은 이름의 파일을 다시 올리면 최신 내용으로 교체됩니다.
          </span>
          <span className="text-xs leading-relaxed text-[var(--ink-500)]">
            ※ 문서 내용은 답변 생성을 위해 외부 AI 서비스로 전송됩니다. 직원
            이름·사번·연락처 등 개인정보가 포함된 문서는 올리지 마세요.
          </span>
          <input
            id="pdf-upload"
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            disabled={isUploading}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        {isUploading && (
          <p className="text-sm text-[var(--ink-500)]">{progress}</p>
        )}

        {!isUploading && uploadSuccessMessage && (
          <p className="text-sm font-semibold text-[var(--accent)]">
            {uploadSuccessMessage}
          </p>
        )}

        {errors.length > 0 && (
          <ul className="flex flex-col gap-1 rounded-xl border-l-2 border-[var(--danger)] bg-[var(--ink-50)] px-5 py-3 text-sm text-[var(--danger)]">
            {errors.map((message, idx) => (
              <li key={idx}>{message}</li>
            ))}
          </ul>
        )}
      </section>

      {/* 저장된 문서 목록 */}
      <section className="flex flex-col gap-5 border-t border-[var(--ink-100)] pt-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold tracking-tight text-[var(--ink-900)]">
            저장된 문서
          </h2>
          {documents.length > 0 && (
            <p className="text-sm font-semibold text-[var(--accent)]">
              ✓ 문서 준비 완료 ({documents.length}개)
            </p>
          )}
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-[var(--ink-500)]">
            아직 올린 문서가 없습니다. 문서를 올리면 직원이 질문할 수 있습니다.
          </p>
        ) : (
          <ul className="flex flex-col border-t border-[var(--ink-100)]">
            {/* 최근에 올린 문서를 위에 보여준다 (목록은 오래된 순으로 내려온다) */}
            {[...documents].reverse().map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 border-b border-[var(--ink-100)] py-4"
              >
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-semibold text-[var(--ink-900)]">
                    {doc.name}
                  </span>
                  <span className="text-xs text-[var(--ink-500)]">
                    {new Date(doc.uploaded_at).toLocaleString("ko-KR")} 등록
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                  className="shrink-0 rounded-full border border-[var(--ink-300)] px-5 py-2 text-xs font-semibold text-[var(--ink-900)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {deletingId === doc.id ? "삭제 중..." : "삭제"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
