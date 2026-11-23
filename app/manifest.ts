import type { MetadataRoute } from "next";

// 추가 기능 — 홈 화면에 추가(PWA). 폰·PC 브라우저에서 앱처럼 설치해서 바로 열 수 있다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "오늘의 운동 코치",
    short_name: "운동 코치",
    description:
      "운동 기록을 저장하면 AI가 피드백과 다음 운동 계획을 알려 주는 개인 운동 코칭 서비스",
    lang: "ko",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#12151b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
