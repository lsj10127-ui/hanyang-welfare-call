"use client";

import { useState, type KeyboardEvent } from "react";

interface ChatMessage {
  role: "user" | "assistant" | "error";
  content: string;
}

interface Props {
  /** 서버에 준비된 문서 수. 0이면 아직 안내할 수 있는 내용이 없다. */
  documentCount: number;
}

export default function ChatPanel({ documentCount }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  const hasDocuments = documentCount > 0;

  async function handleSend() {
    const trimmed = question.trim();
    if (!trimmed || isSending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setQuestion("");
    setIsSending(true);

    try {
      // 문서는 서버가 직접 읽으므로 질문만 보낸다.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
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
    <section className="flex flex-col gap-4 rounded-3xl border border-[var(--brand-100)] bg-white p-6 shadow-sm sm:p-8">
      <div className="flex max-h-[420px] min-h-[200px] flex-col gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-sm text-[var(--brand-500)]">
            {hasDocuments
              ? "복지 제도에 대해 궁금한 점을 물어보세요."
              : "현재 안내 가능한 문서가 없습니다. 총무팀에 문의해 주세요."}
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
            답변을 찾고 있어요...
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--brand-100)] pt-4 sm:flex-row">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasDocuments
              ? "예) 경조사 지원금은 얼마인가요?"
              : "안내 가능한 문서가 준비되면 질문할 수 있습니다"
          }
          disabled={!hasDocuments || isSending}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-[var(--brand-100)] px-4 py-2.5 text-sm text-[var(--brand-900)] outline-none focus:border-[var(--brand-500)] disabled:bg-[var(--brand-50)]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!hasDocuments || !question.trim() || isSending}
          className="inline-flex items-center justify-center rounded-full bg-[var(--brand-600)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-700)] disabled:cursor-not-allowed disabled:bg-[var(--brand-100)] disabled:text-[var(--brand-500)]"
        >
          보내기
        </button>
      </div>
    </section>
  );
}
