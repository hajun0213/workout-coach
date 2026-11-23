// 다크 모드 — 사용자가 고른 화면 색(밝게/어둡게)을 이 브라우저(localStorage)에 저장하고 <html data-theme="…">로 적용한다.
// 고르지 않았다면 기기(브라우저)의 어두운 화면 설정을 따른다. (색 값은 app/globals.css의 토큰)
export const THEME_KEY = "theme";
export type Theme = "light" | "dark";

/**
 * 화면이 처음 그려지기 전에 저장된 선택을 적용하는 한 줄 스크립트. (깜빡임 방지)
 * 코드 안에 고정된 문자열이고 사용자 입력은 들어가지 않는다. 값이 light/dark일 때만 적용한다.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/** 지금 실제로 적용 중인 화면 색 */
export function effectiveTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const attr = document.documentElement.dataset.theme;
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const listeners = new Set<() => void>();

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => listener();
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** 지금 적용 중인 색(서버 화면에서는 항상 밝게) */
export function getThemeSnapshot(): Theme {
  return effectiveTheme();
}

/** 화면 색을 정하고 저장한다. 저장이 막혀 있어도 이번 방문에는 적용된다. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 저장이 막혀도 화면 색은 바뀐 채로 둔다.
  }
  listeners.forEach((listener) => listener());
}
