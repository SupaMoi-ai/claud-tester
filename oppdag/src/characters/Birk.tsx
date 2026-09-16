import { Face, Mouth, type Mood } from './Face';

/**
 * BIRK — a friendly young bear.
 *
 * Nature, animals and outdoor adventures. Rounder and heavier than the others;
 * nothing about Birk is sharp.
 */
export function Birk({ mood = 'idle' }: { mood?: Mood }) {
  return (
    <g>
      {/* Legs */}
      <ellipse cx="74" cy="154" rx="17" ry="13" fill="#B98763" />
      <ellipse cx="126" cy="154" rx="17" ry="13" fill="#B98763" />

      {/* Arms */}
      <ellipse cx="52" cy="122" rx="14" ry="19" fill="#C08F6A" transform="rotate(-18 52 122)" />
      <ellipse cx="148" cy="122" rx="14" ry="19" fill="#C08F6A" transform="rotate(18 148 122)" />

      {/* Body */}
      <path
        d="M 58 116 C 58 88 142 88 142 116 L 142 138 C 142 158 118 164 100 164 C 82 164 58 158 58 138 Z"
        fill="#CB9A74"
      />
      <ellipse cx="100" cy="132" rx="27" ry="24" fill="#EBD3B8" />

      {/* Ears */}
      <circle cx="62" cy="46" r="20" fill="#CB9A74" />
      <circle cx="62" cy="46" r="11" fill="#EBB9A0" />
      <circle cx="138" cy="46" r="20" fill="#CB9A74" />
      <circle cx="138" cy="46" r="11" fill="#EBB9A0" />

      {/* Head */}
      <ellipse cx="100" cy="74" rx="46" ry="42" fill="#D6A57E" />
      <ellipse cx="72" cy="86" rx="10" ry="7" fill="#E8A894" opacity="0.6" />
      <ellipse cx="128" cy="86" rx="10" ry="7" fill="#E8A894" opacity="0.6" />

      {/* Snout */}
      <ellipse cx="100" cy="92" rx="23" ry="17" fill="#F0DCC6" />
      <ellipse cx="100" cy="84" rx="7.5" ry="5.6" fill="#3A2E28" />

      <Face mood={mood} cx={100} cy={66} gap={32} scale={1.2} />
      <Mouth mood={mood} cx={100} cy={97} scale={0.9} />
    </g>
  );
}
