/**
 * Open-Meteo의 WMO 날씨 코드를 우리 화면에 쓸 아이콘·문구로 바꾼다.
 * https://open-meteo.com/en/docs 의 WMO Weather interpretation codes 표 기준.
 */
type WeatherKind = "sun" | "cloud" | "fog" | "rain" | "snow" | "storm";

function kindFromCode(code: number): WeatherKind {
  if (code === 0) return "sun";
  if (code === 1 || code === 2 || code === 3) return "cloud";
  if (code === 45 || code === 48) return "fog";
  if (code === 71 || code === 73 || code === 75 || code === 77 || code === 85 || code === 86) {
    return "snow";
  }
  if (code === 95 || code === 96 || code === 99) return "storm";
  return "rain"; // 51~67, 80~82(이슬비·비·소나기) 등 나머지는 비 계열로 묶는다.
}

const LABELS: Record<WeatherKind, string> = {
  sun: "맑음",
  cloud: "흐림",
  fog: "안개",
  rain: "비",
  snow: "눈",
  storm: "뇌우",
};

export function weatherLabel(code: number): string {
  return LABELS[kindFromCode(code)];
}

export default function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  const kind = kindFromCode(code);
  const common = {
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true as const,
  };

  if (kind === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4.5" />
        <path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
      </svg>
    );
  }
  if (kind === "cloud") {
    return (
      <svg {...common}>
        <path d="M7 18h10a4 4 0 0 0 .4-8 5.5 5.5 0 0 0-10.6 1.8A3.5 3.5 0 0 0 7 18z" />
      </svg>
    );
  }
  if (kind === "fog") {
    return (
      <svg {...common}>
        <path d="M4 9h16M4 13h16M6 17h12" />
      </svg>
    );
  }
  if (kind === "rain") {
    return (
      <svg {...common}>
        <path d="M7 15h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1.5A3 3 0 0 0 7 15z" />
        <path d="M8.5 18.5 7.5 20M12.5 18.5l-1 1.5M16.5 18.5l-1 1.5" />
      </svg>
    );
  }
  if (kind === "snow") {
    return (
      <svg {...common}>
        <path d="M7 14h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1.5A3 3 0 0 0 7 14z" />
        <path d="M8 18v2.5M12 18v2.5M16 18v2.5M7 19.3l2-1.3M11 19.3l2-1.3M15 19.3l2-1.3" />
      </svg>
    );
  }
  // storm
  return (
    <svg {...common}>
      <path d="M7 13h9.5a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.7 1.5A3 3 0 0 0 7 13z" />
      <path d="M13 13.5 10.5 18h3l-1.8 4" />
    </svg>
  );
}
