"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { extractPdfText } from "./extractPdfText";

interface DocEntry {
  name: string;
  text: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "error";
  content: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<DocEntry[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setIsParsing(true);
    try {
      const newDocs: DocEntry[] = [];
      const emptyNames: string[] = [];
      for (const file of Array.from(fileList)) {
        if (file.type !== "application/pdf") continue;
        const text = await extractPdfText(file);
        if (text.trim().length === 0) {
          emptyNames.push(file.name);
          continue;
        }
        newDocs.push({ name: file.name, text });
      }
      setDocuments((prev) => [...prev, ...newDocs]);
      if (emptyNames.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            role: "error",
            content: `이 문서는 읽을 수 없습니다. 텍스트가 포함된 PDF로 다시 올려주세요: ${emptyNames.join(", ")}`,
          },
        ]);
      }
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || documents.length === 0 || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, documents }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "error", content: data.error ?? "오류가 발생했습니다." },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer },
        ]);
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          content: "일시적인 오류로 답변할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-[var(--background)] px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold text-[var(--brand-900)] sm:text-3xl">
            한양복지콜
          </h1>
          <p className="mt-2 text-sm text-[var(--brand-700)] sm:text-base">
            총무팀이 복지 문서를 올리면, 직원들이 그 내용을 물어볼 수 있는
            챗봇입니다.
          </p>
        </div>

        {/* 문서 업로드 */}
        <section className="rounded-3xl border border-[var(--brand-100)] bg-white p-6 shadow-sm sm:p-8">
          <label
            htmlFor="pdf-upload"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--brand-100)] bg-[var(--brand-50)] px-6 py-10 text-center transition-colors hover:border-[var(--brand-500)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-[var(--brand-500)]"
            >
              <path d="M12 16V4M12 4 7 9M12 4l5 5" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </svg>
            <span className="text-sm font-medium text-[var(--brand-700)]">
              클릭해서 복지 문서(PDF)를 올려주세요 (여러 개 선택 가능)
            </span>
            <input
              id="pdf-upload"
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>

          {isParsing && (
            <p className="mt-4 text-sm text-[var(--brand-500)]">
              문서를 읽는 중입니다...
            </p>
          )}

          {documents.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--brand-100)] px-4 py-1.5 text-sm font-semibold text-[var(--brand-700)]">
                ✓ 문서 준비 완료 ({documents.length}개)
              </p>
              <ul className="flex flex-col gap-1 text-sm text-[var(--brand-700)]">
                {documents.map((doc, idx) => (
                  <li key={`${doc.name}-${idx}`}>
                    · {doc.name} ({doc.text.length.toLocaleString()}자 추출됨)
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* 대화 영역 */}
        <section className="flex flex-col gap-4 rounded-3xl border border-[var(--brand-100)] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex max-h-[420px] min-h-[160px] flex-col gap-3 overflow-y-auto">
            {messages.length === 0 && (
              <p className="text-sm text-[var(--brand-500)]">
                문서를 올린 뒤 궁금한 점을 물어보세요.
              </p>
            )}
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[var(--brand-600)] px-4 py-2.5 text-sm text-white"
                    : msg.role === "error"
                    ? "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-red-50 px-4 py-2.5 text-sm text-red-600"
                    : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-[var(--brand-50)] px-4 py-2.5 text-sm text-[var(--brand-900)]"
                }
              >
                {msg.content}
              </div>
            ))}
            {isSending && (
              <div className="mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-[var(--brand-50)] px-4 py-2.5 text-sm text-[var(--brand-500)]">
                답변을 생각하고 있어요...
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--brand-100)] pt-4 sm:flex-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                documents.length === 0
                  ? "먼저 문서를 올려주세요"
                  : "복지 제도에 대해 궁금한 점을 물어보세요"
              }
              disabled={documents.length === 0 || isSending}
              rows={2}
              className="flex-1 resize-none rounded-2xl border border-[var(--brand-100)] px-4 py-2.5 text-sm text-[var(--brand-900)] outline-none focus:border-[var(--brand-500)] disabled:bg-[var(--brand-50)]"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={documents.length === 0 || !question.trim() || isSending}
              className="inline-flex items-center justify-center rounded-full bg-[var(--brand-600)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:bg-[var(--brand-100)] disabled:text-[var(--brand-500)]"
            >
              보내기
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
