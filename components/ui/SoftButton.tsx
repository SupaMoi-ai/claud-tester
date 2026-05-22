"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
  disabled?: boolean;
}

export function SoftButton({
  children,
  onClick,
  type = "button",
  variant = "primary",
  disabled,
}: Props) {
  const base =
    "inline-flex items-center justify-center px-5 py-3 rounded-sm text-sm tracking-wide transition-colors duration-300 ease-soft disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-ink text-cream hover:bg-ink/90"
      : "bg-transparent text-ink hover:bg-cream";

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles}`}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
    >
      {children}
    </motion.button>
  );
}
