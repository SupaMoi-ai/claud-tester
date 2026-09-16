import { Face, Mouth, type Mood } from './Face';

/**
 * BOLT — a small, eccentric invention robot.
 *
 * Maths, engineering and problem solving. Deliberately asymmetric: one round
 * eye panel, one square, a bent antenna. Bolt is clever but slightly wonky,
 * which makes being wrong feel normal.
 */
export function Bolt({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <g>
      {/* Antenna */}
      <path
        d="M 100 46 C 98 32 110 28 116 18"
        stroke="#B9A5E4" strokeWidth="6" strokeLinecap="round" fill="none"
      />
      <circle cx="118" cy="15" r="9" fill="#F78A77" />
      <circle cx="115" cy="12" r="3" fill="#FFFFFF" opacity="0.8" />

      {/* Legs */}
      <rect x="72" y="146" width="16" height="20" rx="8" fill="#9E8AC9" />
      <rect x="112" y="146" width="16" height="20" rx="8" fill="#9E8AC9" />
      <ellipse cx="80" cy="168" rx="14" ry="7" fill="#7E6BAC" />
      <ellipse cx="120" cy="168" rx="14" ry="7" fill="#7E6BAC" />

      {/* Arms */}
      <path
        d="M 52 108 C 34 106 30 124 38 134"
        stroke="#B9A5E4" strokeWidth="9" strokeLinecap="round" fill="none"
      />
      <circle cx="37" cy="137" r="9" fill="#FFCF76" />
      <path
        d="M 148 108 C 166 106 172 122 166 132"
        stroke="#B9A5E4" strokeWidth="9" strokeLinecap="round" fill="none"
      />
      <circle cx="166" cy="135" r="9" fill="#FFCF76" />

      {/* Body */}
      <rect x="54" y="96" width="92" height="56" rx="22" fill="#C9B8EC" />
      <rect x="68" y="112" width="30" height="22" rx="8" fill="#FFE9BD" />
      <rect x="106" y="112" width="26" height="22" rx="11" fill="#FFCF76" />
      <circle cx="119" cy="123" r="5" fill="#DE6450" />

      {/* Head */}
      <rect x="58" y="42" width="84" height="60" rx="26" fill="#D6C8F2" />
      <rect x="66" y="50" width="68" height="44" rx="20" fill="#F3EDFC" />

      <Face mood={mood} cx={100} cy={70} gap={30} scale={1.1} />
      <Mouth mood={mood} cx={100} cy={86} scale={0.8} />
    </g>
  );
}
