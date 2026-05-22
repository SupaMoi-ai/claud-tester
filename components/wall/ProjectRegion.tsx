"use client";

import { motion } from "framer-motion";

// A soft tinted region behind a project's pins. Label only appears
// when zoomed out enough (camera.z < 0.7) so it doesn't clutter the
// close-up view.
export function ProjectRegion({
  label,
  zoom,
  pins,
}: {
  label: string;
  zoom: number;
  pins: { x: number; y: number }[];
}) {
  if (pins.length === 0) return null;

  // bounding box with padding
  const PAD = 80;
  const PIN_W = 180;
  const PIN_H = 240;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pins) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + PIN_W > maxX) maxX = p.x + PIN_W;
    if (p.y + PIN_H > maxY) maxY = p.y + PIN_H;
  }

  const x = minX - PAD;
  const y = minY - PAD;
  const w = maxX - minX + PAD * 2;
  const h = maxY - minY + PAD * 2;

  const showLabel = zoom < 0.7;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width: w, height: h }}
    >
      <motion.div
        className="absolute inset-0 rounded-3xl"
        style={{ background: "rgba(168, 181, 160, 0.18)" }}
        animate={{ scale: [1, 1.015, 1] }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {showLabel && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span
            className="serif-faded"
            style={{ fontSize: `${Math.max(28, 60 / zoom)}px` }}
          >
            {label}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
