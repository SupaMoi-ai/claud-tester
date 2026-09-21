import { CapacityPicker } from '../../components/CapacityPicker';
import { Sheet } from '../../components/Sheet';
import { copy } from '../../copy';
import type { CapacityLevel } from '../../domain/types';

/**
 * One question, four answers. Choosing re-plans Today immediately and closes,
 * so the whole thing is two taps from anywhere on Today.
 */
export function OverwhelmSheet({
  open,
  onOpenChange,
  capacity,
  onChoose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capacity: CapacityLevel;
  onChoose: (capacity: CapacityLevel) => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={copy.overwhelm.title}
      subtitle={copy.overwhelm.subtitle}
    >
      <CapacityPicker
        value={capacity}
        onChange={(next) => {
          onChoose(next);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}
