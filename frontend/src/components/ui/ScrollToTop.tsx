import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Componente que reinicia el scroll al inicio de la página cada vez que cambia la ruta.
 * Resuelve el problema de persistencia de scroll entre navegaciones en React Router.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Usamos instant para evitar saltos visuales durante la carga de la nueva página
    });
  }, [pathname]);

  return null;
}
