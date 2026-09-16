import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { BackButton } from '../design/BackButton';
import { useCopy } from '../i18n';

const HOLD_MS = 3000;

/**
 * The parent gate.
 *
 * A three-second press-and-hold: trivial for an adult, reliably beyond a
 * six-year-old's patience, and — unlike a maths puzzle — it doesn't accidentally
 * become a challenge the child wants to beat. Everything behind it (settings,
 * data, reset) is adult-only by design.
 */
export function ParentGate() {
  const copy = useCopy();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!holding) {
      if (raf.current) cancelAnimationFrame(raf.current);
      return;
    }

    startedAt.current = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startedAt.current;
      const p = Math.min(1, elapsed / HOLD_MS);
      setProgress(p);
      if (p >= 1) {
        navigate('/foreldre', { replace: true });
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [holding, navigate]);

  const release = () => {
    setHolding(false);
    setProgress(0);
  };

  const circumference = 2 * Math.PI * 78;

  return (
    <Screen
      backdrop={<Backdrop kind="calm" />}
      background="bg-sand"
      center
      width="narrow"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/verden')} label={copy.gate.childBack} />
        </div>
      }
    >
      <div className="flex flex-col items-center text-center">
        <h1 className="text-title text-ink md:text-huge">{copy.gate.title}</h1>
        <p className="mt-3 max-w-sm text-body text-ink-soft">{copy.gate.body}</p>

        <button
          onPointerDown={(e) => {
            e.preventDefault();
            setHolding(true);
          }}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          aria-label={copy.gate.body}
          className="relative mt-10 flex h-48 w-48 items-center justify-center rounded-full
            bg-snow shadow-lifted transition-transform active:scale-95"
        >
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 192 192" aria-hidden>
            <circle
              cx="96" cy="96" r="78"
              fill="none" stroke="#ECE0D1" strokeWidth="9"
            />
            <motion.circle
              cx="96" cy="96" r="78"
              fill="none"
              stroke="#84CFA6"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: circumference * (1 - progress) }}
              transition={{ duration: 0.05, ease: 'linear' }}
            />
          </svg>

          <span className="relative font-display text-lead font-semibold text-ink">
            {holding ? copy.gate.holding : '🔒'}
          </span>
        </button>

        <motion.p
          className="mt-6 h-6 text-label text-ink-faint"
          animate={{ opacity: holding ? 1 : 0 }}
        >
          {copy.gate.hint}
        </motion.p>
      </div>
    </Screen>
  );
}
