import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // لينك زي /#contact: ينزل على القسم (بعد ما يتحمل) بدل ما يطلع لفوق
    if (hash) {
      const id = hash.slice(1);
      let tries = 0;
      const timer = setInterval(() => {
        const el = document.getElementById(id);
        if (el || tries >= 20) {
          clearInterval(timer);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        tries += 1;
      }, 100);
      return () => clearInterval(timer);
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
