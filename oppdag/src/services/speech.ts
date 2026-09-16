/**
 * Speech input.
 *
 * Uses the browser's Web Speech API when it exists and the page is allowed to
 * use a microphone. When it doesn't — which is the common case in an embedded
 * preview, and always the case in the automated QA run — it falls back to a
 * mocked transcript that is clearly labelled as mocked in the UI.
 *
 * The fallback is honest on purpose: the child is told Lumi guessed, rather
 * than being shown a fake "we heard you".
 */

export interface SpeechResult {
  text: string;
  /** True when the text came from the mock, not from a real microphone. */
  mocked: boolean;
}

/** Plausible things an 8-year-old might say after the Svalbard adventure. */
const MOCK_ANSWERS = [
  'Det kuleste var at isbjørnen ikke er hvit egentlig, håra er gjennomsiktige!',
  'Jeg likte best da vi fant mammaen til isbjørnungen.',
  'At det var tre kilometer igjen, og at jeg klarte å regne det ut selv.',
  'At Svalbard ligger så langt nord, nesten helt på toppen av kartet.',
];

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    | (new () => SpeechRecognitionLike)
    | undefined;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function isSpeechAvailable(): boolean {
  return getRecognition() !== null;
}

function mockResult(): SpeechResult {
  const i = Math.floor(Math.random() * MOCK_ANSWERS.length);
  return { text: MOCK_ANSWERS[i] as string, mocked: true };
}

/**
 * Starts listening. Returns a `stop()` that resolves the pending promise with
 * whatever was heard — or with a mocked line if nothing was.
 */
export function listen(): { stop: () => void; result: Promise<SpeechResult> } {
  const recognition = getRecognition();

  if (!recognition) {
    let settle: (r: SpeechResult) => void = () => {};
    const result = new Promise<SpeechResult>((resolve) => {
      settle = resolve;
    });
    return {
      stop: () => settle(mockResult()),
      result,
    };
  }

  let settle: (r: SpeechResult) => void = () => {};
  let done = false;
  const result = new Promise<SpeechResult>((resolve) => {
    settle = (r) => {
      if (done) return;
      done = true;
      resolve(r);
    };
  });

  recognition.lang = 'nb-NO';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript;
    settle(
      transcript && transcript.trim()
        ? { text: transcript.trim(), mocked: false }
        : mockResult(),
    );
  };
  recognition.onerror = () => settle(mockResult());
  recognition.onend = () => settle(mockResult());

  try {
    recognition.start();
  } catch {
    settle(mockResult());
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        settle(mockResult());
      }
    },
    result,
  };
}
