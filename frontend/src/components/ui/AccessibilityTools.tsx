import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Moves keyboard and screen-reader users to the start of each new route. */
export function RouteFocusManager() {
  const location = useLocation();

  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;

    main.focus({ preventScroll: true });
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    window.scrollTo({ top: 0, behavior });
  }, [location.pathname, location.search]);

  return null;
}

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only z-[100] rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-elegant focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
    >
      Saltar al contenido principal
    </a>
  );
}
