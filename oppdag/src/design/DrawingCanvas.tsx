import { useCallback, useEffect, useRef, useState } from 'react';
import { PrimaryButton } from './PrimaryButton';
import { useCopy } from '../i18n';

interface Props {
  onSave: (dataUrl: string) => void;
  saveLabel?: string;
}

/** Chunky crayon colours — few enough to choose from without deliberating. */
const CRAYONS = [
  { id: 'ink', hex: '#3A2E28' },
  { id: 'coral', hex: '#E8604B' },
  { id: 'butter', hex: '#F5B940' },
  { id: 'moss', hex: '#4FA87B' },
  { id: 'sky', hex: '#3F9AD0' },
  { id: 'lavender', hex: '#8B73C4' },
  { id: 'berry', hex: '#E8698D' },
  { id: 'snow', hex: '#FFFFFF' },
];

const SIZES = [8, 18, 34];

/**
 * A real drawing surface — pointer events, so it works with a finger on an
 * iPad, a stylus, or a mouse.
 *
 * Strokes are kept as point lists rather than baked straight into the bitmap,
 * which is what makes undo possible: every redraw replays the list. The canvas
 * is exported downscaled, because these get stored in localStorage.
 */
export function DrawingCanvas({ onSave, saveLabel }: Props) {
  const copy = useCopy();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  type Stroke = { colour: string; width: number; points: { x: number; y: number }[] };
  const strokes = useRef<Stroke[]>([]);
  const drawing = useRef(false);

  const [colour, setColour] = useState(CRAYONS[0]!.hex);
  const [width, setWidth] = useState(SIZES[1]!);
  const [hasInk, setHasInk] = useState(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of strokes.current) {
      ctx.strokeStyle = stroke.colour;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      stroke.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      // A single tap should still leave a dot.
      if (stroke.points.length === 1) {
        const p = stroke.points[0]!;
        ctx.lineTo(p.x + 0.1, p.y + 0.1);
      }
      ctx.stroke();
    }
  }, []);

  /** Size the bitmap to the element, accounting for device pixel ratio. */
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [redraw]);

  const pointFrom = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    strokes.current.push({ colour, width, points: [pointFrom(e)] });
    setHasInk(true);
    redraw();
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    strokes.current[strokes.current.length - 1]?.points.push(pointFrom(e));
    redraw();
  };

  const end = () => {
    drawing.current = false;
  };

  const undo = () => {
    strokes.current.pop();
    setHasInk(strokes.current.length > 0);
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    setHasInk(false);
    redraw();
  };

  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Downscale before storing — this ends up in localStorage.
    const out = document.createElement('canvas');
    const scale = Math.min(1, 640 / canvas.width);
    out.width = Math.round(canvas.width * scale);
    out.height = Math.round(canvas.height * scale);
    out.getContext('2d')?.drawImage(canvas, 0, 0, out.width, out.height);
    onSave(out.toDataURL('image/png'));
  };

  return (
    <div>
      {/* Capped by viewport height, not just aspect ratio: on a landscape iPad
          a pure 4:3 canvas pushed the crayons and the save button off-screen. */}
      <div
        ref={wrapRef}
        className="relative aspect-[4/3] max-h-[42vh] w-full overflow-hidden
          rounded-lg bg-[#FFFDF8] shadow-lifted"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          className="absolute inset-0 touch-none"
          aria-label="Tegneflate"
          role="img"
        />
      </div>

      {/* Crayons */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {CRAYONS.map((crayon) => (
          <button
            key={crayon.id}
            onClick={() => setColour(crayon.hex)}
            aria-label={crayon.id}
            aria-pressed={colour === crayon.hex}
            className={`h-12 w-12 rounded-full shadow-soft transition-transform
              ${colour === crayon.hex ? 'scale-115 ring-4 ring-ink/20' : 'active:scale-95'}`}
            style={{
              backgroundColor: crayon.hex,
              border: crayon.hex === '#FFFFFF' ? '2px solid #ECE0D1' : undefined,
            }}
          />
        ))}
      </div>

      {/* Brush sizes + actions */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {SIZES.map((size) => (
          <button
            key={size}
            onClick={() => setWidth(size)}
            aria-label={`Penselstørrelse ${size}`}
            aria-pressed={width === size}
            className={`flex h-12 w-12 items-center justify-center rounded-full shadow-soft
              ${width === size ? 'bg-ink/10 ring-4 ring-ink/15' : 'bg-snow'}`}
          >
            <span
              className="block rounded-full bg-ink"
              style={{ width: size * 0.7, height: size * 0.7 }}
            />
          </button>
        ))}

        <button
          onClick={undo}
          disabled={!hasInk}
          className="min-h-[3rem] rounded-lg bg-snow px-5 font-display text-body
            font-semibold text-ink-soft shadow-soft disabled:opacity-40"
        >
          {copy.drawing.undo}
        </button>
        <button
          onClick={clear}
          disabled={!hasInk}
          className="min-h-[3rem] rounded-lg bg-snow px-5 font-display text-body
            font-semibold text-ink-soft shadow-soft disabled:opacity-40"
        >
          {copy.drawing.clear}
        </button>
      </div>

      <div className="mt-6 flex justify-center">
        <PrimaryButton onClick={save} tone="moss" disabled={!hasInk}>
          {saveLabel ?? copy.drawing.save}
        </PrimaryButton>
      </div>
    </div>
  );
}
