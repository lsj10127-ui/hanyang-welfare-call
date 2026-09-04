import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 다른 사이트가 우리 화면(특히 /admin)을 iframe에 넣어 클릭을
          // 가로채는 클릭재킹을 막는다.
          { key: "X-Frame-Options", value: "DENY" },
          // 브라우저가 응답 내용을 보고 Content-Type을 제멋대로 추측하지 않게 한다.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 다른 사이트로 이동할 때 우리 쪽 URL(질문 등 민감할 수 있는 경로)을
          // 그대로 넘기지 않는다.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
