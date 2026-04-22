import React, { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, WifiOff, ShieldX, Clock, X } from "lucide-react";

export type ErrorModalVariant =
  | "generic"          // Error genérico de operación
  | "network"          // Sin conexión / servidor caído
  | "unauthorized"     // Token expirado durante la sesión
  | "forbidden"        // Acción no permitida al usuario
  | "validation";      // Error de validación del formulario

interface ErrorModalProps {
  open: boolean;
  onClose: () => void;
  variant?: ErrorModalVariant;
  /** Mensaje específico del error (viene del servidor) */
  message?: string;
  /** Acción secundaria opcional (ej. "Ir a login") */
  action?: {
    label: string;
    onClick: () => void;
  };
}

const VARIANT_CONFIG: Record<
  ErrorModalVariant,
  { icon: ReactNode; title: string; iconClass: string }
> = {
  generic: {
    icon: <AlertCircle className="h-6 w-6" />,
    title: "Ocurrió un error",
    iconClass: "text-destructive",
  },
  network: {
    icon: <WifiOff className="h-6 w-6" />,
    title: "Sin conexión",
    iconClass: "text-destructive",
  },
  unauthorized: {
    icon: <Clock className="h-6 w-6" />,
    title: "Sesión expirada",
    iconClass: "text-destructive",
  },
  forbidden: {
    icon: <ShieldX className="h-6 w-6" />,
    title: "Acción no permitida",
    iconClass: "text-destructive",
  },
  validation: {
    icon: <AlertCircle className="h-6 w-6" />,
    title: "Datos inválidos",
    iconClass: "text-destructive",
  },
};

export default function ErrorModal({
  open,
  onClose,
  variant = "generic",
  message,
  action,
}: ErrorModalProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" id="error-modal">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className={`${config.iconClass} shrink-0`}>{config.icon}</span>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed text-foreground/80">
            {message || "Por favor, intenta de nuevo o contacta al soporte si el problema persiste."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 gap-2"
            id="error-modal-close"
          >
            <X className="h-4 w-4" />
            Cerrar
          </Button>
          {action && (
            <Button
              onClick={action.onClick}
              className="flex-1"
              id="error-modal-action"
            >
              {action.label}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook de conveniencia para usar el modal de error.
 *
 * @example
 *   const { errorModal, showError } = useErrorModal();
 *   // ...
 *   showError("Credenciales inválidas", "generic");
 *   // ...
 *   return <>{errorModal}</>;
 */
export function useErrorModal(opts?: {
  action?: { label: string; onClick: () => void };
}) {
  const [state, setState] = useState<{
    open: boolean;
    message: string;
    variant: ErrorModalVariant;
  }>({ open: false, message: "", variant: "generic" });

  const showError = (message: string, variant: ErrorModalVariant = "generic") => {
    setState({ open: true, message, variant });
  };

  const closeError = () => setState((s) => ({ ...s, open: false }));

  const errorModal = (
    <ErrorModal
      open={state.open}
      onClose={closeError}
      variant={state.variant}
      message={state.message}
      action={opts?.action}
    />
  );

  return { errorModal, showError, closeError };
}
