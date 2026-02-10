"use client";
import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export const GlowingEffect = ({
  children,
  className,
  glowColor = "rgba(200, 16, 46, 0.4)",
  blur = 60,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  blur?: number;
}) => {
  return (
    <div className={cn("relative group", className)}>
      <motion.div
        className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-75 transition-opacity duration-500"
        style={{
          background: glowColor,
          filter: `blur(${blur}px)`,
        }}
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
};
