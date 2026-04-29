import React from "react";
import { motion } from "framer-motion";

export default function SplashScreen() {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Logo Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1], // Custom cubic-bezier for premium feel
          }}
          className="relative"
        >
          <img
            src="/logo.png"
            alt="Tembleques Camila"
            className="h-24 w-24 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          
          {/* Subtle pulse effect around logo */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl -z-10"
          />
        </motion.div>

        {/* Text Animation */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mt-8 text-center"
        >
          <h1 
            className="text-2xl font-display font-black tracking-tighter text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Tembleques <span className="text-primary italic">Camila</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-2 font-medium">
            Tradición Panameña Premium
          </p>
        </motion.div>

        {/* Minimal loading indicator */}
        <div className="mt-12 w-48 h-[1px] bg-border/40 relative overflow-hidden">
          <motion.div
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            }}
            className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-primary/40 to-transparent"
          />
        </div>
      </div>
    </motion.div>
  );
}
