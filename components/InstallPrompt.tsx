"use client";

import { useEffect, useState } from "react";

// 추가 기능 — "홈 화면에 추가" 안내. 설치할 수 있는 브라우저(크롬·엣지 등)에서만 버튼이 보인다.
// 설치용 최소 서비스 워커(public/sw.js)도 여기서 등록한다. (배포된 주소에서만 동작하고, 로컬 개발 중에는 등록하지 않는다)
type InstallEvent = Event & { prompt: () => Promise<void> };

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    function onPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as InstallEvent);
    }
    const onInstalled = () => setInstallEvent(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!installEvent) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void installEvent.prompt();
        setInstallEvent(null);
      }}
      className="mt-3 rounded-xl bg-ink/5 px-4 py-2 text-sm font-medium text-ink/70 transition-colors hover:bg-ink/10"
    >
      홈 화면에 앱으로 추가
    </button>
  );
}
