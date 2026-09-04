/**
 * 카테고리 이름에 맞는 아이콘을 보여준다.
 *
 * 총무팀이 카테고리 이름을 자유롭게 입력하므로 정확히 일치시키지 않고,
 * 이름에 포함된 키워드로 판단한다. 맞는 게 없으면 기본 아이콘(물음표)을 쓴다.
 */

import type { ReactNode } from "react";

interface Props {
  category: string;
  className?: string;
}

const ICONS: { keywords: string[]; render: (className?: string) => ReactNode }[] = [
  {
    keywords: ["경조", "축하", "결혼", "출산"],
    render: (className) => (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <rect x="3" y="9" width="18" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 13h18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 9v11" stroke="currentColor" strokeWidth="1.8" />
        <path
          d="M12 9c-1.8 0-3.2-1-3.2-2.6C8.8 5 10 4 11.2 4.6 12 5 12 9 12 9zM12 9c1.8 0 3.2-1 3.2-2.6C15.2 5 14 4 12.8 4.6 12 5 12 9 12 9z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    keywords: ["주차", "차량"],
    render: (className) => (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M4.5 15.5 6 9.8a2 2 0 0 1 1.9-1.5h8.2a2 2 0 0 1 1.9 1.5l1.5 5.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="3" y="15.5" width="18" height="4.2" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="7" cy="19.7" r="1.3" fill="currentColor" />
        <circle cx="17" cy="19.7" r="1.3" fill="currentColor" />
        <path d="M6.5 12h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    keywords: ["편의", "할인", "매장", "식당", "커피", "카페"],
    render: (className) => (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path
          d="M4 4h16l1.2 5a2.3 2.3 0 0 1-4.4 1.1A2.3 2.3 0 0 1 12.4 12a2.3 2.3 0 0 1-4.4-1.9A2.3 2.3 0 0 1 3.8 9L4 4z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M5.5 10.5V19a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5" stroke="currentColor" strokeWidth="1.7" />
        <path d="M10 20v-4a2 2 0 0 1 4 0v4" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    keywords: ["의료", "진료", "건강", "병원", "검진"],
    render: (className) => (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    keywords: ["학자금", "교육", "자녀"],
    render: (className) => (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
        <path d="M12 5 3 9.5 12 14l9-4.5L12 5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M6.5 11.7V16c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-4.3" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
];

const DEFAULT_ICON = (className?: string) => (
  <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M9.8 9.3a2.3 2.3 0 1 1 3.4 2c-.8.5-1.2 1-1.2 2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="12" cy="16.7" r="1" fill="currentColor" />
  </svg>
);

export default function CategoryIcon({ category, className }: Props) {
  const matched = ICONS.find((icon) =>
    icon.keywords.some((keyword) => category.includes(keyword))
  );
  return <>{(matched?.render ?? DEFAULT_ICON)(className)}</>;
}
