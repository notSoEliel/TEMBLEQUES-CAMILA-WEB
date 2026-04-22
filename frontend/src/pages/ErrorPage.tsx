import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, ShieldX, Clock, ServerCrash, SearchX } from "lucide-react";

export type ErrorPageVariant =
  | "not-found"        // 404 — página o recurso no existe
  | "unauthorized"     // 401 — no autenticado
  | "forbidden"        // 403 — autenticado pero sin permiso
  | "session-expired"  // 401 — token vencido
  | "server-error"     // 500 — error interno
  | "product-not-found"; // 404 específico de producto

interface ErrorPageProps {
  variant?: ErrorPageVariant;
  title?: string;
  description?: string;
  /** Si se provee, se usa en lugar del botón "Volver atrás" */
  backTo?: string;
  backLabel?: string;
}

const VARIANTS: Record<
  ErrorPageVariant,
  {
    icon: React.ReactNode;
    code: string;
    title: string;
    description: string;
    primaryAction: { label: string; to: string };
    accentClass: string;
  }
> = {
  "not-found": {
    icon: <SearchX className="w-16 h-16" />,
    code: "404",
    title: "Página no encontrada",
    description:
      "La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.",
    primaryAction: { label: "Ir al inicio", to: "/" },
    accentClass: "text-primary",
  },
  "product-not-found": {
    icon: <SearchX className="w-16 h-16" />,
    code: "404",
    title: "Producto no encontrado",
    description:
      "El producto que buscas no existe o fue retirado del catálogo. Explora otras opciones disponibles.",
    primaryAction: { label: "Ver catálogo", to: "/catalog" },
    accentClass: "text-primary",
  },
  unauthorized: {
    icon: <ShieldX className="w-16 h-16" />,
    code: "401",
    title: "Acceso restringido",
    description:
      "Debes iniciar sesión para ver esta página. Crea una cuenta o inicia sesión para continuar.",
    primaryAction: { label: "Iniciar sesión", to: "/login" },
    accentClass: "text-destructive",
  },
  "session-expired": {
    icon: <Clock className="w-16 h-16" />,
    code: "401",
    title: "Sesión expirada",
    description:
      "Tu sesión ha vencido por inactividad. Inicia sesión nuevamente para continuar.",
    primaryAction: { label: "Iniciar sesión", to: "/login" },
    accentClass: "text-destructive",
  },
  forbidden: {
    icon: <ShieldX className="w-16 h-16" />,
    code: "403",
    title: "Acceso denegado",
    description:
      "No tienes permisos para ver esta sección. Si crees que es un error, contacta al administrador.",
    primaryAction: { label: "Ir al inicio", to: "/" },
    accentClass: "text-destructive",
  },
  "server-error": {
    icon: <ServerCrash className="w-16 h-16" />,
    code: "500",
    title: "Error del servidor",
    description:
      "Ocurrió un error inesperado en nuestros servidores. Estamos trabajando para resolverlo. Intenta de nuevo en unos minutos.",
    primaryAction: { label: "Ir al inicio", to: "/" },
    accentClass: "text-destructive",
  },
};

export default function ErrorPage({
  variant = "not-found",
  title,
  description,
  backTo,
  backLabel,
}: ErrorPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const config = VARIANTS[variant];

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Big code + icon */}
        <div className="relative inline-flex flex-col items-center">
          <span
            className="text-[8rem] font-black leading-none select-none opacity-10"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {config.code}
          </span>
          <div className={`absolute inset-0 flex items-center justify-center ${config.accentClass}`}>
            {config.icon}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title ?? config.title}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {description ?? config.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
            id="error-back-button"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel ?? "Volver atrás"}
          </Button>
          <Button
            onClick={() => navigate(config.primaryAction.to)}
            className="gap-2"
            id="error-primary-button"
          >
            <Home className="h-4 w-4" />
            {config.primaryAction.label}
          </Button>
        </div>

        {/* Debug hint in dev */}
        {import.meta.env.DEV && (
          <p className="text-xs text-muted-foreground/50 font-mono">
            path: {location.pathname}
          </p>
        )}
      </div>
    </div>
  );
}
