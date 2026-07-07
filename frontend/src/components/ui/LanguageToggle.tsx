import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n, type Language } from "@/i18n";

export function LanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();

  const options: Language[] = ["es", "en"];

  return (
    <div className={cn("flex items-center gap-1 rounded-full border border-border/50 bg-background/70 p-1", className)} aria-label={t("language.label")}>
      <Languages className="h-4 w-4 text-muted-foreground ml-2" aria-hidden="true" />
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          variant={language === option ? "default" : "ghost"}
          size="sm"
          onClick={() => setLanguage(option)}
          className="h-8 rounded-full px-3 text-[10px] font-black"
          aria-pressed={language === option}
        >
          {t(`language.${option}`)}
        </Button>
      ))}
    </div>
  );
}
