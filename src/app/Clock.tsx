"use client";

import { useEffect, useState } from "react";

/**
 * 오늘 날짜와 현재 시각을 초 단위로 보여준다.
 *
 * 서버가 렌더링한 시각과 브라우저가 마운트되는 시각이 항상 살짝 다르므로,
 * 처음에는 아무것도 그리지 않다가 마운트된 뒤에만 실제 시각을 채운다.
 * 그렇지 않으면 서버·클라이언트가 그린 내용이 달라 하이드레이션 오류가 난다.
 */
export default function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    // 이펙트 본문에서 곧바로 setState를 부르지 않도록 한 틱 미룬다(react-hooks/set-state-in-effect).
    const initial = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(initial);
      clearInterval(id);
    };
  }, []);

  if (!now) return null;

  const date = now.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const time = now.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--ink-50)] px-4 py-1.5 text-xs font-medium text-[var(--ink-500)]">
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
      <span>
        {date} · {time}
      </span>
    </div>
  );
}
