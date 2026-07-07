import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider } from "@clerk/clerk-react";
import { esES } from "@clerk/localizations";
import App from "./App";
import "./index.css";
import { I18nProvider } from "@/i18n";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("VITE_CLERK_PUBLISHABLE_KEY is not defined. Check your .env file.");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/" 
      localization={esES}
      appearance={{
        layout: {
          socialButtonsVariant: "blockButton",
          logoPlacement: "inside",
        },
        variables: {
          colorPrimary: "#b01c4c",
          colorBackground: "#fdfcfc",
          colorText: "#2d161a",
          colorInputBackground: "#ffffff",
          colorInputText: "#2d161a",
          borderRadius: "2rem",
          fontFamily: "Outfit, system-ui, sans-serif",
        },
        elements: {
          card: "shadow-elegant-lg border-none !border-0 bg-background/50 backdrop-blur-md",
          headerTitle: "font-display font-black tracking-tighter text-3xl text-foreground",
          headerSubtitle: "text-muted-foreground font-medium",
          socialButtonsBlockButton: "rounded-full border border-border/40 hover:bg-muted/50 transition-all !shadow-none",
          socialButtonsBlockButtonText: "font-bold text-foreground",
          formButtonPrimary: "rounded-full shadow-elegant bg-brand-gradient hover:opacity-90 transition-all font-bold py-3",
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
      <I18nProvider>
        <App />
      </I18nProvider>
    </ClerkProvider>
  </React.StrictMode>
);
