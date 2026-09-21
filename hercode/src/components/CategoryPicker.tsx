import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { copy } from '../copy';
import type { BrainCategory } from '../domain/types';
import { Chip } from './Chip';

const CATEGORIES: BrainCategory[] = [
  'task',
  'shopping',
  'appointment',
  'idea',
  'remember',
  'meal',
  'someday',
];

/**
 * Shows where something landed, not every place it could have landed. The
 * other six categories appear only once she asks to change it.
 */
export function CategoryPicker({
  value,
  onChange,
}: {
  value: BrainCategory;
  onChange: (category: BrainCategory) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <Chip
        selected
        onClick={() => setEditing(true)}
        ariaLabel={`${copy.common.edit}: ${copy.brain.categoryLabel[value]}`}
        className="mt-2 gap-1.5 px-3 py-1 text-[13px]"
      >
        {copy.brain.categoryLabel[value]}
        <Pencil size={12} aria-hidden className="opacity-60" />
      </Chip>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {CATEGORIES.map((category) => (
        <Chip
          key={category}
          selected={category === value}
          onClick={() => {
            onChange(category);
            setEditing(false);
          }}
          className="px-3 py-1 text-[13px]"
        >
          {copy.brain.categoryLabel[category]}
        </Chip>
      ))}
    </div>
  );
}
