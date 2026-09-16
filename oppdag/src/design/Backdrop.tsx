import { motion, useReducedMotion } from 'framer-motion';

type BackdropKind = 'hills' | 'arctic' | 'aurora' | 'calm';

/**
 * The soft landscape that sits behind a screen.
 *
 * Hills, clouds and an aurora — never a gradient wash. Drawn as one wide SVG
 * so it scales to any viewport without reflowing, and pinned to the bottom so
 * content always has clear space above it.
 */
export function Backdrop({ kind = 'hills' }: { kind?: BackdropKind }) {
  const reduced = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {kind === 'aurora' && <Aurora reduced={reduced ?? false} />}
      {kind !== 'calm' && <Clouds reduced={reduced ?? false} tint={kind === 'arctic' ? '#FFFFFF' : '#FFFFFF'} />}

      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        style={{ height: '38vh', minHeight: 200 }}
      >
        {kind === 'arctic' ? (
          <>
            <path d="M0 190 C 180 130 320 210 520 176 C 720 142 880 206 1080 172 C 1240 146 1360 186 1440 168 L1440 320 L0 320 Z" fill="#DCEDF7" />
            <path d="M0 232 C 200 196 360 250 600 224 C 840 198 1020 246 1240 220 C 1340 208 1400 224 1440 218 L1440 320 L0 320 Z" fill="#EAF4FA" />
            <path d="M0 274 C 240 250 420 288 700 268 C 980 248 1180 284 1440 264 L1440 320 L0 320 Z" fill="#F7FBFD" />
          </>
        ) : (
          <>
            <path d="M0 196 C 190 132 330 214 540 180 C 750 146 900 208 1110 176 C 1260 152 1370 190 1440 174 L1440 320 L0 320 Z" fill="#CFE7D8" />
            <path d="M0 238 C 210 200 380 254 620 228 C 860 202 1040 250 1260 224 C 1350 214 1404 228 1440 222 L1440 320 L0 320 Z" fill="#DDEFE3" />
            <path d="M0 278 C 250 254 430 292 710 272 C 990 252 1190 288 1440 268 L1440 320 L0 320 Z" fill="#EFF6EE" />
          </>
        )}
      </svg>
    </div>
  );
}

function Clouds({ reduced, tint }: { reduced: boolean; tint: string }) {
  const clouds = [
    { top: '9%', size: 150, duration: 44, delay: 0, opacity: 0.85 },
    { top: '19%', size: 96, duration: 62, delay: -18, opacity: 0.65 },
    { top: '5%', size: 118, duration: 78, delay: -42, opacity: 0.5 },
  ];

  return (
    <>
      {clouds.map((cloud, i) => (
        <motion.svg
          key={i}
          viewBox="0 0 120 54"
          width={cloud.size}
          className="absolute"
          style={{ top: cloud.top, opacity: cloud.opacity }}
          initial={{ x: reduced ? 120 * i + 60 : '-25vw' }}
          animate={reduced ? undefined : { x: ['-25vw', '115vw'] }}
          transition={
            reduced
              ? undefined
              : {
                  duration: cloud.duration,
                  delay: cloud.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }
          }
        >
          <path
            d="M24 44 C 8 44 4 28 18 24 C 18 8 42 4 50 16 C 58 4 82 6 84 20 C 102 18 110 34 98 42 C 92 46 34 46 24 44 Z"
            fill={tint}
          />
        </motion.svg>
      ))}
    </>
  );
}

function Aurora({ reduced }: { reduced: boolean }) {
  const bands = [
    { d: 'M-100 150 C 200 60 480 190 760 100 C 1000 24 1300 140 1560 70', stroke: '#84CFA6', width: 46, opacity: 0.4, duration: 17 },
    { d: 'M-100 200 C 220 118 500 240 780 154 C 1040 76 1320 190 1560 120', stroke: '#8CCDEE', width: 34, opacity: 0.34, duration: 21 },
    { d: 'M-100 116 C 240 40 520 150 800 66 C 1060 -8 1340 104 1560 40', stroke: '#B8A5E4', width: 26, opacity: 0.3, duration: 25 },
  ];

  return (
    <svg
      className="absolute left-0 top-0 w-full"
      viewBox="0 0 1440 300"
      preserveAspectRatio="none"
      style={{ height: '46vh' }}
    >
      {bands.map((band, i) => (
        <motion.path
          key={i}
          d={band.d}
          stroke={band.stroke}
          strokeWidth={band.width}
          strokeLinecap="round"
          fill="none"
          opacity={band.opacity}
          style={{ filter: 'blur(14px)' }}
          animate={reduced ? undefined : { y: [0, 22, -10, 0], opacity: [band.opacity, band.opacity * 1.45, band.opacity] }}
          transition={
            reduced
              ? undefined
              : { duration: band.duration, repeat: Infinity, ease: 'easeInOut' }
          }
        />
      ))}
    </svg>
  );
}
