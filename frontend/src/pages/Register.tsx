import React from "react";
import { SignUp } from "@clerk/clerk-react";

/**
 * Clerk SignUp component with appearance customized to match
 * the platform's OKLCH theme.
 */
export default function Register() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <style>
        {`
          .cl-headerTitle { font-family: 'Playfair Display', serif !important; }
        `}
      </style>
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        fallbackRedirectUrl="/"
        appearance={{
          elements: {
            cardBox: "!shadow-elegant-lg !border-none !rounded-[2rem] !bg-background/80 !backdrop-blur-md w-full !overflow-hidden",
            card: "!bg-transparent !border-none !shadow-none p-8 pb-4 w-full",
            headerTitle: "text-4xl !font-black !font-display !text-foreground tracking-tighter",
            headerSubtitle: "!text-muted-foreground !font-medium",
            socialButtonsBlockButton:
              "!border !border-border/40 !rounded-full !bg-white hover:!bg-muted/50 !text-foreground !font-bold !shadow-none transition-all py-3",
            dividerLine: "!bg-border/40",
            dividerText: "!text-muted-foreground/50 !font-bold !uppercase !tracking-widest !text-[10px]",
            formFieldLabel: "!text-muted-foreground/70 !font-black !uppercase !tracking-widest !text-[10px]",
            formFieldInput:
              "!border !border-border/40 !rounded-xl !bg-white !text-foreground focus:!ring-2 focus:!ring-primary/20 !shadow-none py-3 px-4 transition-all",
            formButtonPrimary:
              "!bg-brand-gradient !text-white !border-none !rounded-full !shadow-elegant hover:!opacity-90 transition-all !font-bold text-lg py-3",
            footerActionLink: "!text-primary hover:!text-primary/80 !font-bold",
            footerActionText: "!text-muted-foreground !font-medium",
            identityPreviewText: "!text-foreground !font-bold",
            identityPreviewEditButton: "!text-primary !font-bold",
            footer: "!bg-transparent !border-none !pt-0 !pb-6 !px-8",
          },
          variables: {
            colorPrimary: "#b01c4c",
            colorBackground: "#fdfcfc",
            colorText: "#1a1a1a",
            borderRadius: "2rem",
            fontFamily: "Outfit, sans-serif",
          },
        }}
      />
    </div>
  );
}
