import React from "react";
import { SignIn } from "@clerk/clerk-react";

/**
 * Clerk SignIn component with appearance customized to match
 * the platform's OKLCH theme.
 */
export default function Login() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <style>
        {`
          .cl-headerTitle { font-family: 'Playfair Display', serif !important; }
        `}
      </style>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        fallbackRedirectUrl="/"
        appearance={{
          elements: {
            cardBox: "!bg-[#F7F4E9] !border-[3px] !border-black !rounded-[2rem] !shadow-none w-full !overflow-hidden",
            card: "!bg-transparent !border-none !shadow-none p-8 pb-4 w-full",
            headerTitle: "text-4xl !font-black !text-black",
            headerSubtitle: "!text-black/70 !font-medium",
            socialButtonsBlockButton:
              "!border-2 !border-black !rounded-full !bg-white hover:!bg-black/5 !text-black !font-bold !shadow-none transition-all py-3",
            dividerLine: "!bg-black/20",
            dividerText: "!text-black/50 !font-bold",
            formFieldLabel: "!text-black !font-bold",
            formFieldInput:
              "!border-2 !border-black !rounded-full !bg-white !text-black focus:!ring-2 focus:!ring-[#F92E73] focus:!border-black !shadow-none py-3 px-4",
            formButtonPrimary:
              "!bg-[#F92E73] !text-white !border-2 !border-black !rounded-full !shadow-none hover:!opacity-90 transition-all !font-bold text-lg py-3",
            footerActionLink: "!text-[#F92E73] hover:!text-[#D11A58] !font-bold",
            footerActionText: "!text-black !font-medium",
            identityPreviewText: "!text-black !font-medium",
            identityPreviewEditButton: "!text-[#F92E73] !font-bold",
            formResendCodeLink: "!text-[#F92E73] !font-bold",
            alertText: "!text-red-600 !font-bold",
            alert: "!border-2 !border-red-600 !bg-red-50 !rounded-xl",
            footer: "!bg-transparent !border-none !pt-0 !pb-6 !px-8",
          },
          variables: {
            colorPrimary: "#F92E73",
            colorBackground: "#F7F4E9",
            colorText: "#000000",
            colorInputBackground: "#FFFFFF",
            colorInputText: "#000000",
            borderRadius: "2rem",
            fontFamily: "Inter, sans-serif",
          },
        }}

      />
    </div>
  );
}
