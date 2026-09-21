import { useState } from 'react';
import { Button } from '../../components/Button';
import { CapacityPicker } from '../../components/CapacityPicker';
import { Chip } from '../../components/Chip';
import { Sheet } from '../../components/Sheet';
import { copy } from '../../copy';
import type { BrainState, CapacityLevel, Feeling, ISODate } from '../../domain/types';
import { cn } from '../../lib/cn';
import { useHerCode } from '../../store/useHerCode';

const BRAIN_STATES: BrainState[] = ['foggy', 'normal', 'sharp'];

const FEELINGS: Feeling[] = [
  'calm',
  'overwhelmed',
  'restless',
  'focused',
  'sensitive',
  'tired',
  'social',
  'need space',
];

/** Full-screen, about five seconds, and skippable. It changes Today straight away. */
export function MorningCheckIn({ open, date }: { open: boolean; date: ISODate }) {
  const saveCheckIn = useHerCode((s) => s.saveCheckIn);
  const skipCheckIn = useHerCode((s) => s.skipCheckIn);

  const [energy, setEnergy] = useState(3);
  const [brain, setBrain] = useState<BrainState>('normal');
  const [capacity, setCapacity] = useState<CapacityLevel>('normal');
  const [feelings, setFeelings] = useState<Feeling[]>([]);

  const toggleFeeling = (feeling: Feeling) =>
    setFeelings((current) =>
      current.includes(feeling) ? current.filter((f) => f !== feeling) : [...current, feeling],
    );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) skipCheckIn(date);
      }}
      title={copy.checkIn.title}
      subtitle={copy.checkIn.subtitle}
      full
      footer={
        <div className="flex items-center gap-3">
          <Button variant="quiet" onClick={() => skipCheckIn(date)}>
            {copy.common.skip}
          </Button>
          <Button
            variant="primary"
            full
            onClick={() => saveCheckIn({ date, energy, brain, capacity, feelings })}
          >
            {copy.checkIn.submit}
          </Button>
        </div>
      }
    >
      <section className="mb-6">
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">{copy.checkIn.energy}</h3>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={energy === value}
              aria-label={copy.checkIn.energyScale[value - 1]}
              onClick={() => setEnergy(value)}
              className={cn(
                'tap flex flex-1 flex-col items-center justify-end gap-1.5 rounded-card border py-2 transition-colors duration-200',
                energy === value ? 'border-ink/30 bg-sage/60' : 'border-line bg-surface',
              )}
            >
              <span
                className="w-2.5 rounded-full bg-ink/70"
                style={{ height: `${8 + value * 6}px` }}
                aria-hidden
              />
              <span className="text-[11px] leading-none text-muted">{value}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-muted">{copy.checkIn.energyScale[energy - 1]}</p>
      </section>

      <section className="mb-6">
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">{copy.checkIn.brain}</h3>
        <div className="flex gap-2">
          {BRAIN_STATES.map((state) => (
            <Chip
              key={state}
              selected={brain === state}
              onClick={() => setBrain(state)}
              className="flex-1"
            >
              {copy.checkIn.brainOptions[state]}
            </Chip>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">{copy.checkIn.capacity}</h3>
        <CapacityPicker value={capacity} onChange={setCapacity} compact />
      </section>

      <section>
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">{copy.checkIn.feelings}</h3>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((feeling) => (
            <Chip
              key={feeling}
              selected={feelings.includes(feeling)}
              onClick={() => toggleFeeling(feeling)}
            >
              {feeling}
            </Chip>
          ))}
        </div>
      </section>
    </Sheet>
  );
}
