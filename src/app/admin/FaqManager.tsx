"use client";

import { useState, type KeyboardEvent } from "react";
import type { FaqQuestion } from "@/lib/supabase";

interface Props {
  /** 서버에서 미리 읽어온 질문 목록 */
  initialQuestions: FaqQuestion[];
}

export default function FaqManager({ initialQuestions }: Props) {
  const [questions, setQuestions] = useState<FaqQuestion[]>(initialQuestions);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/faq");
    const data = await res.json();
    if (res.ok) setQuestions(data.questions);
  }

  async function handleAdd() {
    const trimmed = draft.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    setError("");
    try {
      const res = await fetch("/api/faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "질문을 저장하지 못했습니다.");
        return;
      }
      setDraft("");
      await refresh();
    } catch {
      setError("질문을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(item: FaqQuestion) {
    setDeletingId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/faq/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "질문을 삭제하지 못했습니다.");
      }
      await refresh();
    } catch {
      setError("질문을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <section className="flex flex-col gap-5 border-t-2 border-[var(--navy)] pt-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-black tracking-tight text-[var(--ink-900)]">
          자주 묻는 질문
        </h2>
        <p className="text-sm leading-relaxed text-[var(--ink-500)]">
          여기에 등록한 질문이 직원 화면에 버튼으로 표시되어, 직원이 눌러서 바로
          물어볼 수 있습니다. 평소 전화나 메신저로 자주 받는 질문을 적어 주세요.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예) 경조사 지원금은 얼마인가요?"
          maxLength={100}
          disabled={isSaving}
          className="flex-1 border border-[var(--ink-300)] px-4 py-3 text-sm text-[var(--ink-900)] outline-none transition-colors placeholder:text-[var(--ink-500)] focus:border-[var(--navy)] disabled:bg-[var(--ink-50)]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.trim() || isSaving}
          className="bg-[var(--navy)] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:bg-[var(--ink-300)]"
        >
          추가
        </button>
      </div>

      {error && (
        <p className="border-l-2 border-[var(--danger)] bg-[var(--ink-50)] px-5 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-[var(--ink-500)]">
          아직 등록한 질문이 없습니다. 등록하면 직원 화면 첫 부분에 표시됩니다.
        </p>
      ) : (
        <ul className="flex flex-col border-t border-[var(--ink-100)]">
          {questions.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 border-b border-[var(--ink-100)] py-4"
            >
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--ink-900)]">
                {item.question}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                disabled={deletingId === item.id}
                className="shrink-0 border border-[var(--ink-300)] px-5 py-2 text-xs font-bold text-[var(--ink-900)] transition-colors hover:border-[var(--danger)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deletingId === item.id ? "삭제 중..." : "삭제"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
