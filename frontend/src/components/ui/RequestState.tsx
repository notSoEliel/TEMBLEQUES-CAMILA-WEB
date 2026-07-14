import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RequestStateProps {
  title: string;
  message: string;
  retryLabel: string;
  onRetry: () => void;
  busy?: boolean;
}

export function RequestState({ title, message, retryLabel, onRetry, busy = false }: RequestStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-[var(--radius)] border border-destructive/20 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertCircle className="h-8 w-8 text-destructive" aria-hidden="true" />
      <div className="space-y-1">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>
      <Button type="button" variant="outline" onClick={onRetry} disabled={busy} className="gap-2">
        <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} aria-hidden="true" />
        {retryLabel}
      </Button>
    </div>
  );
}
