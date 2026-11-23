// 홈 화면 추가(설치)를 위한 최소 서비스 워커. 요청은 그대로 네트워크로 보내고 아무것도 저장하지 않는다.
// (오래된 화면이 남는 문제를 피하려고 캐시는 쓰지 않는다. 기록은 브라우저 localStorage에 따로 저장된다.)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
