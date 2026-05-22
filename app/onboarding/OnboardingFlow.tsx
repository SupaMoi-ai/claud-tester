"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { SoftButton } from "@/components/ui/SoftButton";

interface Props {
  initialStep: number;
  hasConnection: boolean;
}

export function OnboardingFlow({ initialStep, hasConnection }: Props) {
  const [step, setStep] = useState(initialStep);
  const router = useRouter();

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <Screen key="1">
            <h1 className="font-serif text-3xl leading-tight">
              Pinterest is where you keep your ideas.
              <br />
              Soft Studio is where you live with them.
            </h1>
            <div className="mt-10">
              <SoftButton
                onClick={() => {
                  window.location.href = "/api/auth/pinterest";
                }}
              >
                connect pinterest
              </SoftButton>
            </div>
          </Screen>
        )}

        {step === 2 && (
          <Screen key="2">
            <SyncStep onDone={() => router.push("/wall")} />
          </Screen>
        )}

        {step === 3 && (
          <Screen key="3">
            <p className="font-serif text-2xl text-ink/80">
              Tap any pin to start a project. Or just look around.
            </p>
            <div className="mt-10">
              <SoftButton onClick={() => router.push("/wall")}>
                enter the wall
              </SoftButton>
            </div>
          </Screen>
        )}
      </AnimatePresence>

      {hasConnection && step === 1 && (
        <button
          onClick={() => setStep(2)}
          className="absolute bottom-8 text-sm text-ink/40 hover:text-ink/70"
        >
          already connected? sync now
        </button>
      )}
    </main>
  );
}

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
      className="max-w-md w-full text-center"
    >
      {children}
    </motion.div>
  );
}

function SyncStep({ onDone }: { onDone: () => void }) {
  const [fetched, setFetched] = useState(0);
  const [embedded, setEmbedded] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const es = new EventSource("/api/sync");
    es.addEventListener("pins", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setFetched(d.fetched);
    });
    es.addEventListener("embed", (e) => {
      const d = JSON.parse((e as MessageEvent).data);
      setEmbedded(d.embedded);
      setRemaining(d.remaining);
    });
    es.addEventListener("done", () => {
      setDone(true);
      es.close();
      // Pause for a beat so the user sees "we're being gentle"
      setTimeout(onDone, 900);
    });
    es.addEventListener("error", (e) => {
      const d = (e as MessageEvent).data
        ? JSON.parse((e as MessageEvent).data)
        : null;
      setError(d?.message ?? "something didn't load. try again in a moment.");
      es.close();
    });
    return () => es.close();
  }, [onDone]);

  return (
    <>
      <h2 className="font-serif text-2xl text-ink/85">
        We&apos;re quietly bringing in your things.
      </h2>
      <p className="font-serif text-lg text-ink/55 mt-4">No rush.</p>

      <div className="mt-12 flex items-center justify-center gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-ink/30"
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <div className="mt-10 space-y-1 text-sm text-ink/40 font-sans">
        <p>{fetched > 0 ? `${fetched} pins drifting in` : "looking..."}</p>
        {embedded > 0 && (
          <p>
            {embedded} settled
            {remaining ? `, ${remaining} still arriving` : ""}
          </p>
        )}
        {done && <p>here.</p>}
        {error && <p className="text-ink/60">{error}</p>}
      </div>
    </>
  );
}
