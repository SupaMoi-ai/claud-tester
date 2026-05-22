"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { SoftButton } from "@/components/ui/SoftButton";

export function Landing() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
      },
    });
    setBusy(false);
    if (error) {
      setError("Something didn't load. Try again in a moment.");
      return;
    }
    setSent(true);
  }

  return (
    <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 0.61, 0.36, 1] }}
        className="max-w-md w-full text-center"
      >
        <h1 className="font-serif text-4xl leading-tight text-ink">
          Soft Studio
        </h1>
        <p className="font-serif text-lg mt-6 leading-relaxed text-ink/80">
          Pinterest is where you keep your ideas.
          <br />
          Soft Studio is where you live with them.
        </p>

        {sent ? (
          <p className="mt-10 text-sm text-ink/70">
            Check your email. We sent you a quiet link.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 flex flex-col gap-3">
            <input
              type="email"
              required
              placeholder="your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-cream/80 border border-ink/10 rounded-sm px-4 py-3 text-sm placeholder-ink/40 focus:outline-none focus:border-ink/30"
            />
            <SoftButton type="submit" disabled={busy || !email}>
              {busy ? "sending" : "begin"}
            </SoftButton>
            {error && (
              <p className="text-sm text-ink/60">{error}</p>
            )}
          </form>
        )}
      </motion.div>
    </main>
  );
}
