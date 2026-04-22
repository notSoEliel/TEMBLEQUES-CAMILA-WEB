import React from "react";
import { SignIn } from "@clerk/clerk-react";

/**
 * Clerk SignIn component with appearance customized to match
 * the platform's neobrutalista OKLCH theme.
 */
export default function Login() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        fallbackRedirectUrl="/"
        appearance={{
          elements: {
            rootBox: "w-full max-w-md",
            card: [
              "bg-card border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000000]",
              "w-full",
            ].join(" "),
            headerTitle: "font-serif text-2xl text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "border-2 border-black rounded-none bg-background hover:bg-muted text-foreground font-medium shadow-[2px_2px_0px_0px_#000000] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all",
            dividerLine: "bg-border",
            dividerText: "text-muted-foreground",
            formFieldLabel: "text-foreground font-medium",
            formFieldInput:
              "border-2 border-black rounded-none bg-input text-foreground focus:ring-2 focus:ring-primary focus:border-primary",
            formButtonPrimary:
              "bg-primary text-primary-foreground border-2 border-black rounded-none shadow-[4px_4px_0px_0px_#000000] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all font-semibold",
            footerActionLink: "text-primary hover:text-primary/80 font-semibold",
            identityPreviewText: "text-foreground",
            identityPreviewEditButton: "text-primary",
            formResendCodeLink: "text-primary",
            alertText: "text-destructive",
          },
          variables: {
            colorPrimary: "oklch(0.6862 0.2061 357.3956)",
            colorBackground: "oklch(0.9559 0.0146 102.4588)",
            colorText: "oklch(0 0 0)",
            colorInputBackground: "oklch(1.0000 0 0)",
            colorInputText: "oklch(0 0 0)",
            borderRadius: "0px",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
    </div>
  );
}
