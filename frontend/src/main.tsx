import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { useI18n, I18nProvider } from "@/i18n";
import { esES, enUS } from "@clerk/localizations";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isMockClerkMode = PUBLISHABLE_KEY?.includes("your_clerk_publishable_key");

if (!PUBLISHABLE_KEY && !isMockClerkMode) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not defined. Check your .env file.");
}

function ClerkProviderWithI18n({ children }: { children: React.ReactNode }) {
  const { language } = useI18n();
  const localization = language === "en" ? enUS : esES;

  if (isMockClerkMode) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY!} 
      afterSignOutUrl="/" 
      localization={localization}
      appearance={{
        layout: {
          socialButtonsVariant: "blockButton",
          logoPlacement: "inside",
        },
        variables: {
          colorPrimary: "oklch(56.7% 0.207 3.55)",
          colorBackground: "oklch(99.6% 0.001 3.55)",
          colorText: "oklch(18.2% 0.038 3.55)",
          colorInputBackground: "oklch(100% 0 0)",
          colorInputText: "oklch(18.2% 0.038 3.55)",
          borderRadius: "2rem",
          fontFamily: "Outfit, system-ui, sans-serif",
        },
        elements: {
          card: "shadow-elegant-lg border-none !border-0 bg-background/50 backdrop-blur-md",
          headerTitle: "font-display font-black tracking-tighter text-3xl text-foreground",
          headerSubtitle: "text-muted-foreground font-medium",
          socialButtonsBlockButton: "rounded-full border border-border/40 hover:bg-muted/50 transition-all !shadow-none",
          socialButtonsBlockButtonText: "font-bold text-foreground",
          formButtonPrimary: "rounded-full shadow-elegant bg-primary hover:bg-accent transition-all font-bold py-3",
          formFieldInput: "rounded-xl border border-border/40 focus:ring-2 focus:ring-primary/20 transition-all !shadow-none",
          formFieldLabel: "text-xs font-black uppercase tracking-widest text-muted-foreground/70",
          footerActionLink: "text-primary hover:text-primary/80 font-bold transition-colors",
          identityPreviewText: "text-foreground font-bold",
          identityPreviewEditButtonIcon: "text-primary",
          dividerLine: "bg-border/40",
          dividerText: "text-muted-foreground/50 font-bold text-[10px] uppercase tracking-widest"
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <ClerkProviderWithI18n>
        <App />
      </ClerkProviderWithI18n>
    </I18nProvider>
  </React.StrictMode>
);
