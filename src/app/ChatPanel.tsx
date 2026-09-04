"use client";

import { useState, type KeyboardEvent } from "react";
import type { FaqQuestion } from "@/lib/supabase";
import CategoryIcon from "./CategoryIcon";

interface ChatMessage {
  role: "user" | "assistant" | "error";
  content: string;
}

interface Props {
  /** 서버에 준비된 문서 수. 0이면 아직 안내할 수 있는 내용이 없다. */
  documentCount: number;
  /** 총무팀이 등록한 자주 묻는 질문 */
  faqQuestions: FaqQuestion[];
}

export default function ChatPanel({ documentCount, faqQuestions }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [isSending, setIsSending] = useState(false);

  // 등록된 순서 그대로 카테고리 목록을 뽑는다 (중복 제거).
  const categories = Array.from(
    new Set(faqQuestions.map((item) => item.category))
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(
    categories[0] ?? null
  );

  const hasDocuments = documentCount > 0;

  async function handleSend(overrideQuestion?: string) {
    const trimmed = (overrideQuestion ?? question).trim();
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

  // 아직 대화가 없을 때만 보여준다. 대화가 시작되면 자리를 차지하지 않도록 감춘다.
  const showFaq = hasDocuments && faqQuestions.length > 0 && messages.length === 0;
  const visibleFaqs = faqQuestions.filter((item) => item.category === activeCategory);

  return (
    <section className="flex flex-col">
      {showFaq && (
        <div className="section-dark flex flex-col gap-3 rounded-xl p-4 sm:rounded-2xl sm:p-6">
          <p className="text-sm font-semibold text-[var(--ink-900)]">
            궁금한 주제를 골라 보세요
          </p>
          {categories.length > 1 && (
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={
                      category === activeCategory
                        ? "flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
                        : "flex items-center gap-1.5 rounded-full bg-[var(--ink-50)] px-4 py-2 text-sm text-[var(--ink-700)] transition-colors hover:bg-[var(--ink-100)]"
                    }
                  >
                    <CategoryIcon category={category} className="h-4 w-4 shrink-0" />
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <ul className="flex flex-wrap gap-2">
            {visibleFaqs.map((faq) => (
              <li key={faq.id}>
                <button
                  type="button"
                  onClick={() => handleSend(faq.question)}
                  disabled={isSending}
                  className="rounded-full border border-[var(--ink-300)] px-4 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {faq.question}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex max-h-[440px] min-h-[220px] flex-col gap-5 overflow-y-auto border-t border-[var(--ink-100)] py-8">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            {/* 질문을 기다리고 있다는 표시 */}
            <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
              <path
                d="M6 6h36a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H22L10 46V36H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
              />
              <path
                d="M18 15.5a6 6 0 1 1 6 6v2.5"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="24" cy="28.5" r="1.9" fill="var(--accent)" />
            </svg>
            <p className="text-base text-[var(--ink-500)]">
              {hasDocuments
                ? "예) 경조사 지원금은 얼마인가요?"
                : "현재 안내 가능한 문서가 없습니다. 총무팀에 문의해 주세요."}
            </p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={
              msg.role === "user"
                ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[var(--accent)] px-5 py-3 text-sm leading-relaxed text-white"
                : msg.role === "error"
                ? "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl border-l-2 border-[var(--danger)] bg-[var(--ink-50)] px-5 py-3 text-sm leading-relaxed text-[var(--danger)]"
                : "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-[var(--ink-50)] px-5 py-3 text-sm leading-relaxed text-[var(--ink-900)]"
            }
          >
            {msg.content}
          </div>
        ))}
        {isSending && (
          <div className="mr-auto max-w-[85%] rounded-2xl bg-[var(--ink-50)] px-5 py-3 text-sm text-[var(--ink-500)]">
            답변을 찾고 있어요...
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--ink-100)] pt-6 sm:flex-row sm:items-stretch">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasDocuments
              ? "궁금한 점을 입력하세요"
              : "안내 가능한 문서가 준비되면 질문할 수 있습니다"
          }
          disabled={!hasDocuments || isSending}
          rows={2}
          className="flex-1 resize-none rounded-2xl border border-[var(--ink-300)] bg-[var(--ink-50)] px-4 py-3 text-sm text-[var(--ink-900)] outline-none transition-colors placeholder:text-[var(--ink-500)] focus:border-[var(--accent)] focus:bg-[var(--background)] disabled:text-[var(--ink-500)]"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!hasDocuments || !question.trim() || isSending}
          className="rounded-full bg-[var(--accent)] px-10 py-3 text-sm font-semibold tracking-tight text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-[var(--ink-300)]"
        >
          보내기
        </button>
      </div>
    </section>
  );
}
