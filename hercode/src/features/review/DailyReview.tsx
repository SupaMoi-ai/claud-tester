import { useState } from 'react';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { ScalePicker } from '../../components/ScalePicker';
import { Sheet } from '../../components/Sheet';
import { copy } from '../../copy';
import type { HarderTag, HelpedTag, ISODate } from '../../domain/types';
import { useHerCode } from '../../store/useHerCode';

/** Straight from the unions, so the chips and the types cannot drift apart. */
const HELPED: HelpedTag[] = [
  'smaller tasks',
  'quiet time',
  'partner help',
  'exercise',
  'clear plan',
  'extra sleep',
  'less social activity',
];

const HARDER: HarderTag[] = [
  'too many decisions',
  'noise',
  'poor sleep',
  'social evening',
  'unclear plan',
  'interruptions',
  'long day',
];

/**
 * The end of the day, in two taps. What she puts here is the only insight she
 * writes herself, and Patterns picks it up immediately.
 */
export function DailyReview({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: ISODate;
}) {
  const saveReview = useHerCode((s) => s.saveReview);

  const [capacity, setCapacity] = useState(3);
  const [helped, setHelped] = useState<HelpedTag[]>([]);
  const [harder, setHarder] = useState<HarderTag[]>([]);

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  const close = () => onOpenChange(false);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.review.title}
      subtitle={copy.review.subtitle}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="quiet" onClick={close}>
            {copy.common.skip}
          </Button>
          <Button
            variant="primary"
            full
            onClick={() => {
              saveReview({ date, capacity, helped, harder });
              close();
            }}
          >
            {copy.review.submit}
          </Button>
        </div>
      }
    >
      <section className="mb-6">
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">
          {copy.review.capacity}
        </h3>
        <ScalePicker
          value={capacity}
          onChange={setCapacity}
          labels={copy.review.capacityScale}
          ariaLabel={copy.review.capacity}
        />
      </section>

      <section className="mb-6">
        <h3 className="font-sans text-[15px] font-medium text-ink">{copy.review.helped}</h3>
        <p className="mb-2 text-[13px] text-muted">{copy.review.optional}</p>
        <div className="flex flex-wrap gap-2">
          {HELPED.map((tag) => (
            <Chip
              key={tag}
              selected={helped.includes(tag)}
              onClick={() => setHelped((current) => toggle(current, tag))}
              className="px-3 py-1.5 text-[14px]"
            >
              {tag}
            </Chip>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 font-sans text-[15px] font-medium text-ink">
          {copy.review.harder}
        </h3>
        <div className="flex flex-wrap gap-2">
          {HARDER.map((tag) => (
            <Chip
              key={tag}
              selected={harder.includes(tag)}
              onClick={() => setHarder((current) => toggle(current, tag))}
              className="px-3 py-1.5 text-[14px]"
            >
              {tag}
            </Chip>
          ))}
        </div>
      </section>
    </Sheet>
  );
}
