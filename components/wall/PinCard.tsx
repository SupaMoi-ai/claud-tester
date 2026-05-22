"use client";

import { motion } from "framer-motion";

interface PinLite {
  id: string;
  image_url: string;
  pinterest_description: string | null;
}

export function PinCard({
  pin,
  x,
  y,
  rotation,
  onTap,
}: {
  pin: PinLite;
  x: number;
  y: number;
  rotation: number;
  onTap: () => void;
}) {
  return (
    <motion.button
      data-pin-card
      onClick={onTap}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.6,
        ease: [0.22, 0.61, 0.36, 1],
        delay: Math.random() * 0.4,
      }}
      whileTap={{ scale: 0.97 }}
      className="pin-card absolute overflow-hidden"
      style={{
        left: x,
        top: y,
        width: 180,
        height: 240,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={pin.image_url}
        alt={pin.pinterest_description ?? ""}
        className="w-full h-full object-cover"
        loading="lazy"
        draggable={false}
      />
    </motion.button>
  );
}
