import { ChoiceButton, type ChoiceStatus } from '../../design/ChoiceButton';
import { VisualHintView } from '../VisualHintView';
import type { NumberChoiceStage } from '../types';
import type { Difficulty } from '../../learning/types';

interface Props {
  stage: NumberChoiceStage;
  difficulty: Difficulty;
  statusFor: (key: string) => ChoiceStatus;
  disabled: boolean;
  onChoose: (key: string) => void;
}

/**
 * A number answered by tapping, not typing.
 *
 * The scene's own visual (a walked number line, a pile of stones) sits above
 * the choices so the quantity is always concrete — the child can count it if
 * they want to, which is exactly what we want them doing.
 */
export function NumberChoice({
  stage,
  difficulty,
  statusFor,
  disabled,
  onChoose,
}: Props) {
  const variant = stage.variants[difficulty];

  return (
    <div>
      {variant.visual && (
        <div className="mb-5">
          <VisualHintView hint={variant.visual} />
        </div>
      )}

      <div
        className={`grid gap-3 ${
          variant.options.length > 3 ? 'grid-cols-4' : 'grid-cols-3'
        }`}
      >
        {variant.options.map((value) => (
          <ChoiceButton
            key={value}
            tone="sky"
            display={value}
            status={statusFor(String(value))}
            disabled={disabled}
            onClick={() => onChoose(String(value))}
          >
            km
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
