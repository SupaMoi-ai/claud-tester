"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { PinCard } from "./PinCard";
import { PinTapModal } from "./PinTapModal";
import { ProjectRegion } from "./ProjectRegion";
import { layoutPin } from "@/lib/wall/layout";

interface PinLite {
  id: string;
  image_url: string;
  source_url: string | null;
  pinterest_description: string | null;
  pinterest_board_name: string | null;
  project_id: string | null;
  position_x: number | null;
  position_y: number | null;
}

interface ProjectLite {
  id: string;
  label: string;
  dominant_palette: string[] | null;
  status: string;
  seed_pin_id: string;
}

interface Props {
  pins: PinLite[];
  projects: ProjectLite[];
}

export function Wall({ pins: initialPins, projects: initialProjects }: Props) {
  const [pins, setPins] = useState(initialPins);
  const [projects, setProjects] = useState(initialProjects);
  const [justLooking, setJustLooking] = useState(false);
  const [openPin, setOpenPin] = useState<PinLite | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // Camera state — simple pan/zoom in screen space.
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isPanning = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const movedSincePointerDown = useRef(false);

  useEffect(() => {
    const v = localStorage.getItem("soft-studio-just-looking");
    if (v === "1") setJustLooking(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("soft-studio-just-looking", justLooking ? "1" : "0");
  }, [justLooking]);

  // Centre the camera roughly on the pins on first mount.
  useEffect(() => {
    if (typeof window === "undefined" || pins.length === 0) return;
    const positions = pins.map((p, i) => ({
      x: p.position_x ?? layoutPin(p.id, i).x,
      y: p.position_y ?? layoutPin(p.id, i).y,
    }));
    const avgX =
      positions.reduce((a, p) => a + p.x, 0) / positions.length;
    const avgY =
      positions.reduce((a, p) => a + p.y, 0) / positions.length;
    setCamera({
      x: window.innerWidth / 2 - avgX,
      y: window.innerHeight / 2 - avgY,
      z: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-pin-card]")) return;
    isPanning.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    movedSincePointerDown.current = false;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning.current || !lastPoint.current) return;
    const dx = e.clientX - lastPoint.current.x;
    const dy = e.clientY - lastPoint.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) movedSincePointerDown.current = true;
    lastPoint.current = { x: e.clientX, y: e.clientY };
    setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy }));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isPanning.current = false;
    lastPoint.current = null;
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setCamera((c) => {
      const delta = -e.deltaY * 0.001;
      const nextZ = Math.min(2, Math.max(0.3, c.z * (1 + delta)));
      // zoom around pointer
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { ...c, z: nextZ };
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const k = nextZ / c.z;
      return {
        x: px - (px - c.x) * k,
        y: py - (py - c.y) * k,
        z: nextZ,
      };
    });
  }, []);

  // Project lookup by seed for the ProjectRegion centring fallback.
  const pinsById = useMemo(() => {
    const m = new Map<string, PinLite>();
    for (const p of pins) m.set(p.id, p);
    return m;
  }, [pins]);

  async function startProject(seed: PinLite) {
    setOpenPin(null);
    setCreating(true);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed_pin_id: seed.id }),
      });
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as {
        project: {
          id: string;
          label: string;
          dominant_palette: string[] | null;
          status: string;
          seed_pin_id: string;
        };
        included: string[];
        excluded: string[];
      };

      setProjects((ps) => [...ps, data.project]);
      setPins((ps) =>
        ps.map((p) =>
          data.included.includes(p.id) ? { ...p, project_id: data.project.id } : p
        )
      );
      // Pause to let the gather animation settle, then route to the focused view.
      setTimeout(() => {
        setCreating(false);
        router.push(`/project/${data.project.id}`);
      }, 1800);
    } catch {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden canvas-host">
      {/* The infinite pan/zoom surface */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-10"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`,
            transformOrigin: "0 0",
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          }}
        >
          {!justLooking &&
            projects.map((proj) => {
              const seed = pinsById.get(proj.seed_pin_id);
              const projectPins = pins.filter((p) => p.project_id === proj.id);
              if (!seed) return null;
              return (
                <ProjectRegion
                  key={proj.id}
                  label={proj.label}
                  zoom={camera.z}
                  pins={projectPins.map((p, i) => {
                    const fallback = layoutPin(p.id, i);
                    return {
                      x: p.position_x ?? fallback.x,
                      y: p.position_y ?? fallback.y,
                    };
                  })}
                />
              );
            })}

          {pins.map((p, i) => {
            const fallback = layoutPin(p.id, i);
            const x = p.position_x ?? fallback.x;
            const y = p.position_y ?? fallback.y;
            return (
              <PinCard
                key={p.id}
                pin={p}
                x={x}
                y={y}
                rotation={fallback.rotation}
                onTap={() => {
                  if (movedSincePointerDown.current) return;
                  setOpenPin(p);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* UI overlay */}
      <div className="absolute top-0 right-0 p-4 z-20 flex gap-2">
        <button
          onClick={() => setJustLooking((v) => !v)}
          className={`text-xs tracking-wide px-3 py-2 rounded-sm transition-colors duration-300 ease-soft ${
            justLooking
              ? "bg-ink text-cream"
              : "bg-cream/70 text-ink/70 hover:bg-cream"
          }`}
        >
          {justLooking ? "looking" : "just looking"}
        </button>
      </div>

      <AnimatePresence>
        {openPin && (
          <PinTapModal
            pin={openPin}
            onClose={() => setOpenPin(null)}
            onStartProject={() => startProject(openPin)}
            onSetAside={() => setOpenPin(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {creating && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="bg-cream/85 backdrop-blur-sm px-6 py-4 rounded-sm font-serif text-lg text-ink/70">
              Looking through your saved things...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
