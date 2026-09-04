import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 한글이 많은 화면이라 한글 지원이 좋은 글꼴을 쓴다.
const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  // 링크 공유 시 카드 이미지(opengraph-image.tsx) 등 상대경로를 절대주소로
  // 바꾸는 데 필요하다. 배포 주소가 바뀌면 이 값도 함께 바꾼다.
  metadataBase: new URL("https://my-app-iota-gules-24.vercel.app"),
  title: "(총)무엇이든 물어봐",
  description: "직원 복지 제도를 물어보면 문서 내용을 근거로 답해주는 챗봇",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${notoSansKr.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
