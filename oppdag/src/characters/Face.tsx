export type Mood = 'idle' | 'happy' | 'curious' | 'excited' | 'thinking';

interface FaceProps {
  mood: Mood;
  /** Centre of the face in the character's 200×200 viewBox. */
  cx: number;
  cy: number;
  /** Horizontal distance between the two eyes. */
  gap?: number;
  scale?: number;
  ink?: string;
}

/**
 * The shared expression set.
 *
 * Every character wears the same five moods so the cast reads as one family,
 * drawn by one hand. Eyes and mouth are plain paths — no gradients, no gloss —
 * which is what keeps it feeling like a Scandinavian picture book rather than
 * a 3D mascot.
 */
export function Face({
  mood,
  cx,
  cy,
  gap = 26,
  scale = 1,
  ink = '#3A2E28',
}: FaceProps) {
  const lx = cx - gap / 2;
  const rx = cx + gap / 2;
  const s = scale;

  return (
    <g>
      {mood === 'idle' && (
        <>
          <ellipse cx={lx} cy={cy} rx={4.6 * s} ry={5.6 * s} fill={ink} />
          <ellipse cx={rx} cy={cy} rx={4.6 * s} ry={5.6 * s} fill={ink} />
          <circle cx={lx + 1.6 * s} cy={cy - 2 * s} r={1.6 * s} fill="#fff" opacity={0.9} />
          <circle cx={rx + 1.6 * s} cy={cy - 2 * s} r={1.6 * s} fill="#fff" opacity={0.9} />
        </>
      )}

      {mood === 'happy' && (
        <>
          <path
            d={`M ${lx - 5.5 * s} ${cy + 1.5 * s} q ${5.5 * s} ${-8 * s} ${11 * s} 0`}
            stroke={ink} strokeWidth={3.2 * s} strokeLinecap="round" fill="none"
          />
          <path
            d={`M ${rx - 5.5 * s} ${cy + 1.5 * s} q ${5.5 * s} ${-8 * s} ${11 * s} 0`}
            stroke={ink} strokeWidth={3.2 * s} strokeLinecap="round" fill="none"
          />
        </>
      )}

      {mood === 'curious' && (
        <>
          {/* Deliberately mismatched — a raised brow reads as "hmm…". */}
          <ellipse cx={lx} cy={cy} rx={5.2 * s} ry={6.2 * s} fill={ink} />
          <circle cx={lx + 1.8 * s} cy={cy - 2.2 * s} r={1.8 * s} fill="#fff" opacity={0.9} />
          <ellipse cx={rx} cy={cy + 0.6 * s} rx={4.2 * s} ry={5 * s} fill={ink} />
          <circle cx={rx + 1.4 * s} cy={cy - 1.4 * s} r={1.5 * s} fill="#fff" opacity={0.9} />
          <path
            d={`M ${rx - 6 * s} ${cy - 10 * s} q ${6 * s} ${-3.5 * s} ${12 * s} ${-0.5 * s}`}
            stroke={ink} strokeWidth={2.4 * s} strokeLinecap="round" fill="none"
          />
        </>
      )}

      {mood === 'excited' && (
        <>
          <ellipse cx={lx} cy={cy} rx={5.8 * s} ry={6.8 * s} fill={ink} />
          <ellipse cx={rx} cy={cy} rx={5.8 * s} ry={6.8 * s} fill={ink} />
          <circle cx={lx + 2 * s} cy={cy - 2.6 * s} r={2.2 * s} fill="#fff" />
          <circle cx={rx + 2 * s} cy={cy - 2.6 * s} r={2.2 * s} fill="#fff" />
        </>
      )}

      {mood === 'thinking' && (
        <>
          {/* Eyes drift up and to the side — the universal "let me think". */}
          <ellipse cx={lx} cy={cy - 1 * s} rx={4.4 * s} ry={5.4 * s} fill={ink} />
          <ellipse cx={rx} cy={cy - 1 * s} rx={4.4 * s} ry={5.4 * s} fill={ink} />
          <circle cx={lx - 1.4 * s} cy={cy - 3.4 * s} r={1.6 * s} fill="#fff" opacity={0.9} />
          <circle cx={rx - 1.4 * s} cy={cy - 3.4 * s} r={1.6 * s} fill="#fff" opacity={0.9} />
        </>
      )}
    </g>
  );
}

interface MouthProps {
  mood: Mood;
  cx: number;
  cy: number;
  scale?: number;
  ink?: string;
}

export function Mouth({ mood, cx, cy, scale = 1, ink = '#3A2E28' }: MouthProps) {
  const s = scale;
  switch (mood) {
    case 'happy':
      return (
        <path
          d={`M ${cx - 7 * s} ${cy} q ${7 * s} ${7.5 * s} ${14 * s} 0`}
          stroke={ink} strokeWidth={2.8 * s} strokeLinecap="round" fill="none"
        />
      );
    case 'excited':
      return (
        <path
          d={`M ${cx - 7 * s} ${cy - 1 * s} q ${7 * s} ${12 * s} ${14 * s} 0 z`}
          fill={ink}
        />
      );
    case 'curious':
      return <ellipse cx={cx} cy={cy + 1.5 * s} rx={3 * s} ry={3.6 * s} fill={ink} />;
    case 'thinking':
      return (
        <path
          d={`M ${cx - 5 * s} ${cy + 1 * s} q ${5 * s} ${-2.5 * s} ${10 * s} ${0.5 * s}`}
          stroke={ink} strokeWidth={2.6 * s} strokeLinecap="round" fill="none"
        />
      );
    default:
      return (
        <path
          d={`M ${cx - 5 * s} ${cy} q ${5 * s} ${5 * s} ${10 * s} 0`}
          stroke={ink} strokeWidth={2.6 * s} strokeLinecap="round" fill="none"
        />
      );
  }
}
