import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "(총)무엇이든 물어봐 — 한양대학교병원 총무팀 복지 안내 챗봇";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "(총)무엇이든 물어봐";
const SUBTITLE = "한양대학교병원 총무팀 복지 안내 챗봇";

/**
 * next/og(Satori)는 한글 글리프가 없는 기본 폰트를 쓰므로, 실제로 쓸 글자만
 * Google Fonts에서 서브셋으로 받아와야 한글이 정상적으로 그려진다.
 */
async function loadNotoSansKr(weight: 400 | 700, text: string) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`;
  const css = await fetch(cssUrl).then((res) => res.text());
  const fontUrl = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!fontUrl) throw new Error("Noto Sans KR 폰트 URL을 찾지 못했습니다.");
  return fetch(fontUrl).then((res) => res.arrayBuffer());
}

export default async function Image() {
  const [bold, regular] = await Promise.all([
    loadNotoSansKr(700, TITLE),
    loadNotoSansKr(400, SUBTITLE),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#1d1d1f",
          padding: "90px",
          fontFamily: "Noto Sans KR",
        }}
      >
        <svg width="84" height="84" viewBox="0 0 48 48" style={{ marginBottom: 40 }}>
          <path
            d="M6 6h36a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H22L10 46V36H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4z"
            fill="#2997ff"
          />
        </svg>
        <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: "#ffffff" }}>
          {TITLE}
        </div>
        <div style={{ display: "flex", fontSize: 30, color: "#2997ff", marginTop: 20 }}>
          {SUBTITLE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Noto Sans KR", data: bold, weight: 700, style: "normal" },
        { name: "Noto Sans KR", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
