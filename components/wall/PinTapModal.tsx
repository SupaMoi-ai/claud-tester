"use client";

import { motion } from "framer-motion";

interface PinLite {
  id: string;
  image_url: string;
  source_url: string | null;
  pinterest_description: string | null;
}

export function PinTapModal({
  pin,
  onClose,
  onStartProject,
  onSetAside,
}: {
  pin: PinLite;
  onClose: () => void;
  onStartProject: () => void;
  onSetAside: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 z-40 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <button
        onClick={onClose}
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm"
        aria-label="close"
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="relative bg-cream w-full sm:w-[420px] sm:rounded-sm p-6 pt-8 flex flex-col gap-3"
      >
        <div className="flex items-center gap-4 pb-4 border-b border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pin.image_url}
            alt=""
            className="w-16 h-20 object-cover rounded-sm"
          />
          <p className="text-sm text-ink/70 leading-relaxed">
            {pin.pinterest_description ?? "a saved thing"}
          </p>
        </div>
        <button
          onClick={onStartProject}
          className="text-left font-serif text-lg text-ink py-3 hover:bg-beige/60 px-2 -mx-2 rounded-sm transition-colors duration-200 ease-soft"
        >
          start a project from this
        </button>
        <a
          href={pin.source_url ?? "https://pinterest.com"}
          target="_blank"
          rel="noreferrer"
          className="text-left font-serif text-lg text-ink/70 py-3 hover:bg-beige/60 px-2 -mx-2 rounded-sm transition-colors duration-200 ease-soft"
        >
          open in pinterest
        </a>
        <button
          onClick={onSetAside}
          className="text-left font-serif text-lg text-ink/50 py-3 hover:bg-beige/60 px-2 -mx-2 rounded-sm transition-colors duration-200 ease-soft"
        >
          set aside
        </button>
      </motion.div>
    </motion.div>
  );
}
