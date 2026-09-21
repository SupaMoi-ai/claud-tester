import { cn } from '../lib/cn';

/** Stands in for the model thinking. Motion is disabled under reduced motion. */
export function Shimmer({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2.5', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded-chip bg-sand/70"
          style={{ width: `${88 - i * 14}%`, animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}

export function ShimmerLabel({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 text-[14px] text-muted" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </span>
      {text}
    </p>
  );
}
