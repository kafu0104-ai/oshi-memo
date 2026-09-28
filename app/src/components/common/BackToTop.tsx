import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}
const isScrolled = () => window.scrollY >= 500;

export default function BackToTop() {
  const visible = useSyncExternalStore(subscribe, isScrolled, () => false);
  if (!visible) return null;
  return (
    <button
      type="button"
      className="back-to-top"
      aria-label="ページのトップへ戻る"
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      }}
    >
      <span aria-hidden="true">↑</span>
      <span>トップへ</span>
    </button>
  );
}
