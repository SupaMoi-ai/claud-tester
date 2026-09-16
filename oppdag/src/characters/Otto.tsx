import { Face, Mouth, type Mood } from './Face';

/**
 * OTTO — a slightly chaotic octopus.
 *
 * Odd questions, creativity and lateral thinking. Every tentacle curls a
 * different way on purpose: Otto is the one who makes "wrong" answers feel
 * like interesting answers.
 */
export function Otto({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <g>
      {/* Tentacles — each one different, none tidy */}
      <path
        d="M 60 124 C 40 140 34 158 44 170 C 52 178 64 172 62 160"
        stroke="#C9A3E0" strokeWidth="15" strokeLinecap="round" fill="none"
      />
      <path
        d="M 80 132 C 70 154 74 170 86 172 C 94 172 96 164 92 158"
        stroke="#D5B2E8" strokeWidth="15" strokeLinecap="round" fill="none"
      />
      <path
        d="M 120 132 C 130 152 128 170 116 174 C 108 176 104 166 108 160"
        stroke="#D5B2E8" strokeWidth="15" strokeLinecap="round" fill="none"
      />
      <path
        d="M 140 124 C 162 138 170 156 160 168 C 152 176 140 170 144 158"
        stroke="#C9A3E0" strokeWidth="15" strokeLinecap="round" fill="none"
      />

      {/* Suckers, just a few — texture, not detail */}
      <circle cx="49" cy="163" r="3.4" fill="#F2DFF8" />
      <circle cx="87" cy="166" r="3.4" fill="#F2DFF8" />
      <circle cx="114" cy="167" r="3.4" fill="#F2DFF8" />
      <circle cx="155" cy="162" r="3.4" fill="#F2DFF8" />

      {/* Head / mantle */}
      <path
        d="M 44 92 C 44 44 156 44 156 92 C 156 122 132 138 100 138 C 68 138 44 122 44 92 Z"
        fill="#C79BE2"
      />
      <path
        d="M 60 68 C 74 50 126 50 140 68 C 126 58 74 58 60 68 Z"
        fill="#E2CBF2" opacity="0.8"
      />

      {/* Cheeks */}
      <ellipse cx="62" cy="100" rx="11" ry="7" fill="#F0A0B4" opacity="0.55" />
      <ellipse cx="138" cy="100" rx="11" ry="7" fill="#F0A0B4" opacity="0.55" />

      <Face mood={mood} cx={100} cy={88} gap={38} scale={1.35} />
      <Mouth mood={mood} cx={100} cy={112} scale={0.95} />
    </g>
  );
}
