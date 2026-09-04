"use client";

import { useEffect, useState } from "react";
import WeatherIcon, { weatherLabel } from "./WeatherIcon";
import type { WeatherInfo } from "@/lib/weather";

interface Props {
  weather: WeatherInfo | null;
}

/**
 * 숫자 한 칸(플립시계 타일). 값이 바뀔 때마다 React가 이 span을 새로
 * 마운트하도록 key를 값 자체로 주고, CSS 애니메이션(flipIn)을 얹어서
 * 숫자가 위에서 아래로 넘어가듯 보이게 한다.
 */
function FlipDigit({ value }: { value: string }) {
  return (
    <span className="relative inline-flex h-9 w-6 items-center justify-center overflow-hidden rounded-[5px] bg-[var(--ink-900)] shadow-sm sm:h-11 sm:w-7">
      <span
        key={value}
        className="flip-digit text-base font-bold tabular-nums text-white sm:text-xl"
      >
        {value}
      </span>
      {/* 두 쪽으로 나뉜 플립판처럼 보이게 하는 가운데 이음선 */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-px bg-black/40" />
    </span>
  );
}

function FlipColon() {
  return (
    <span className="mx-0.5 flex h-9 flex-col items-center justify-center gap-1 sm:h-11">
      <span className="h-1 w-1 rounded-full bg-[var(--ink-300)]" />
      <span className="h-1 w-1 rounded-full bg-[var(--ink-300)]" />
    </span>
  );
}

/**
 * 플립시계 스타일의 날짜·시각과, 그 옆에 서울 날씨를 함께 보여준다.
 *
 * 서버가 렌더링한 시각과 브라우저가 마운트되는 시각이 항상 살짝 다르므로,
 * 처음에는 아무것도 그리지 않다가 마운트된 뒤에만 실제 시각을 채운다.
 * 그렇지 않으면 서버·클라이언트가 그린 내용이 달라 하이드레이션 오류가 난다.
 */
export default function Clock({ weather }: Props) {
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
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl bg-[var(--ink-50)] px-3 py-2.5">
        <div className="flex items-center gap-[3px]">
          <FlipDigit value={hh[0]} />
          <FlipDigit value={hh[1]} />
          <FlipColon />
          <FlipDigit value={mm[0]} />
          <FlipDigit value={mm[1]} />
          <FlipColon />
          <FlipDigit value={ss[0]} />
          <FlipDigit value={ss[1]} />
        </div>
        <span className="text-xs font-medium text-[var(--ink-500)]">{date}</span>
      </div>

      {weather && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[var(--ink-50)] px-4 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <WeatherIcon code={weather.code} className="h-4 w-4 text-[var(--accent)]" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-[var(--ink-900)]">
              {Math.round(weather.tempC)}°C
            </p>
            <p className="text-[11px] text-[var(--ink-500)]">
              서울 · {weatherLabel(weather.code)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
