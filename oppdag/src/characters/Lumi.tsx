import { Face, Mouth, type Mood } from './Face';

/**
 * LUMI — a small Arctic fox. The child's companion and guide.
 *
 * Curious, funny, encouraging, never patronising. Lumi's habit is to ask
 * "Hmm… hva tror DU?" rather than hand over the answer, so the drawing leans
 * on the `curious` mood more than any other character.
 */
export function Lumi({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <g>
      {/* Tail — big, soft, slightly behind the body */}
      <path
        d="M 52 128 C 10 120 6 78 30 62 C 22 88 34 108 60 112 Z"
        fill="#F3EBE2"
      />
      <path
        d="M 30 62 C 22 88 34 108 60 112 L 56 120 C 26 116 14 92 30 62 Z"
        fill="#E2D6C9"
      />

      {/* Hind legs */}
      <ellipse cx="72" cy="152" rx="15" ry="11" fill="#E8DED3" />
      <ellipse cx="124" cy="152" rx="15" ry="11" fill="#E8DED3" />

      {/* Body */}
      <path
        d="M 60 112 C 60 82 140 82 140 112 L 140 138 C 140 156 118 160 100 160 C 82 160 60 156 60 138 Z"
        fill="#FAF4EC"
      />
      {/* Chest fluff */}
      <path
        d="M 82 118 C 92 140 108 140 118 118 C 112 146 88 146 82 118 Z"
        fill="#FFFFFF"
      />

      {/* Ears */}
      <path d="M 62 62 L 56 22 L 88 46 Z" fill="#FAF4EC" />
      <path d="M 66 58 L 63 34 L 81 48 Z" fill="#F2A98F" />
      <path d="M 138 62 L 144 22 L 112 46 Z" fill="#FAF4EC" />
      <path d="M 134 58 L 137 34 L 119 48 Z" fill="#F2A98F" />

      {/* Head */}
      <path
        d="M 58 66 C 58 36 142 36 142 66 C 142 96 128 112 100 112 C 72 112 58 96 58 66 Z"
        fill="#FDF9F3"
      />
      {/* Cheek warmth */}
      <ellipse cx="70" cy="82" rx="9" ry="6" fill="#F7CFC2" opacity="0.65" />
      <ellipse cx="130" cy="82" rx="9" ry="6" fill="#F7CFC2" opacity="0.65" />

      {/* Snout */}
      <ellipse cx="100" cy="90" rx="19" ry="14" fill="#FFFFFF" />
      <ellipse cx="100" cy="82" rx="6" ry="4.6" fill="#3A2E28" />

      <Face mood={mood} cx={100} cy={66} gap={34} scale={1.25} />
      <Mouth mood={mood} cx={100} cy={94} scale={0.9} />
    </g>
  );
}
