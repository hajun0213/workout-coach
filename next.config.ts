import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // 응답 머리말에서 "Next.js를 쓴다"는 정보를 숨긴다.
  poweredByHeader: false,
  // 기본 보안 헤더: 다른 사이트가 이 앱을 액자(iframe)에 넣거나, 파일 형식을 속이거나, 주소를 통째로 넘기는 것을 막는다.
  // (CSP는 Next가 넣는 인라인 스크립트와 충돌하지 않게 nonce 설정이 필요해서 배포 단계(PLAN 19번)에서 따로 검토한다.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 다른 사이트가 이 앱의 창을 열어 조작하지 못하게 창 묶음을 분리한다.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
