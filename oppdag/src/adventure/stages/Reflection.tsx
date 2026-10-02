import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AudioButton } from '../../design/AudioButton';
import { PrimaryButton } from '../../design/PrimaryButton';
import { listen, type SpeechResult } from '../../services/speech';
import { sanitizeForChild } from '../../safety/childSafety';
import { useCopy } from '../../i18n';

interface Props {
  onDone: (text: string) => void;
}

/**
 * "Hva var det kuleste du lærte?"
 *
 * Saying it out loud is the point — putting a new idea into your own words is
 * what makes it stick. Typing is offered as an equal alternative, never as the
 * fallback for children who "can't do it properly".
 *
 * Whatever comes back — real transcript or mock — goes through
 * `sanitizeForChild` before it is shown or stored. Today that is belt and
 * braces; the moment any generated text enters this screen it is the seam that
 * keeps it safe.
 */
export function Reflection({ onDone }: Props) {
  const copy = useCopy();
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<SpeechResult | null>(null);
  const [typed, setTyped] = useState('');
  const [typing, setTyping] = useState(false);
  const session = useRef<{ stop: () => void } | null>(null);

  const startListening = () => {
    if (listening) return;
    setListening(true);
    setResult(null);
    const s = listen();
    session.current = s;
    void s.result.then((r) => {
      setListening(false);
      setResult({ ...r, text: sanitizeForChild(r.text).text });
    });
  };

  const stopListening = () => {
    if (!listening) return;
    session.current?.stop();
  };

  const submitTyped = () => {
    const clean = sanitizeForChild(typed).text;
    if (!typed.trim()) return;
    onDone(clean);
  };

  return (
    <div className="flex flex-col items-center">
      {!typing && (
        <AudioButton
          listening={listening}
          onPress={startListening}
          onRelease={stopListening}
          label={listening ? copy.reflection.listening : copy.reflection.hold}
        />
      )}

      <AnimatePresence mode="wait">
        {result && !typing && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 w-full max-w-lg"
          >
            <div className="rounded-lg bg-snow px-6 py-5 shadow-lifted">
              <p className="text-read leading-relaxed text-ink">“{result.text}”</p>
            </div>
            {result.mocked && (
              <p className="mt-2.5 text-center text-label text-ink-faint">
                {copy.reflection.mocked}
              </p>
            )}
            <div className="mt-5 flex justify-center">
              <PrimaryButton onClick={() => onDone(result.text)} tone="moss">
                {copy.reflection.send}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!typing && !result && (
        <button
          onClick={() => setTyping(true)}
          className="mt-5 min-h-[3rem] px-4 font-display text-body font-semibold
            text-ink-faint underline decoration-hairline decoration-2 underline-offset-4
            hover:text-ink-soft"
        >
          {copy.reflection.orType}
        </button>
      )}

      {typing && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={copy.reflection.typePlaceholder}
            rows={4}
            maxLength={300}
            autoFocus
            className="w-full resize-none rounded-lg bg-snow px-6 py-5 text-read
              leading-relaxed text-ink shadow-soft outline-none
              placeholder:text-ink-faint/70 focus:shadow-lifted"
          />
          <div className="mt-5 flex justify-center">
            <PrimaryButton onClick={submitTyped} tone="moss" disabled={!typed.trim()}>
              {copy.reflection.send}
            </PrimaryButton>
          </div>
        </motion.div>
      )}
    </div>
  );
}
