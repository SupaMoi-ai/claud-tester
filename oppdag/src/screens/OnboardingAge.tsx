import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { ChoiceButton } from '../design/ChoiceButton';
import { BackButton } from '../design/BackButton';
import { CharacterBubble } from '../characters/CharacterBubble';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

const AGES = [6, 7, 8, 9, 10];
const GRADES = [1, 2, 3, 4, 5];

export function OnboardingAge() {
  const copy = useCopy();
  const navigate = useNavigate();
  const actions = useActions();
  const { profile } = useGame();

  const [age, setAge] = useState<number | null>(profile?.age ?? null);
  const [grade, setGrade] = useState<number | null>(profile?.grade ?? null);
  const [gradeTouched, setGradeTouched] = useState(false);

  const name = profile?.name ?? '';
  const ready = age !== null && gradeTouched;

  const submit = () => {
    if (!ready || age === null) return;
    actions.createProfile(name, age, grade);
    navigate('/nysgjerrig');
  };

  return (
    <Screen
      backdrop={<Backdrop kind="hills" />}
      width="narrow"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/hei')} />
        </div>
      }
    >
      <div className="mt-14 sm:mt-10">
        <CharacterBubble who="lumi" mood="happy" size={140} speechKey="age" compact>
          {copy.onboarding.ageTitle(name)}
        </CharacterBubble>
      </div>

      <section className="mt-8">
        <h2 className="text-lead text-ink md:text-title">
          {copy.onboarding.ageQuestion}
        </h2>
        <div className="mt-4 grid grid-cols-5 gap-2.5 sm:gap-3">
          {AGES.map((value) => (
            <ChoiceButton
              key={value}
              tone="butter"
              status={age === value ? 'chosen' : 'idle'}
              onClick={() => setAge(value)}
              display={value}
            >
              {copy.onboarding.ageUnit}
            </ChoiceButton>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lead text-ink md:text-title">
          {copy.onboarding.gradeQuestion}
        </h2>
        <div className="mt-4 grid grid-cols-5 gap-2.5 sm:gap-3">
          {GRADES.map((value) => (
            <ChoiceButton
              key={value}
              tone="sky"
              status={grade === value ? 'chosen' : 'idle'}
              onClick={() => {
                setGrade(value);
                setGradeTouched(true);
              }}
              display={value}
            >
              trinn
            </ChoiceButton>
          ))}
        </div>
        <button
          onClick={() => {
            setGrade(null);
            setGradeTouched(true);
          }}
          className={`mt-3 min-h-[3rem] rounded-md px-5 font-display text-body font-semibold
            ${
              gradeTouched && grade === null
                ? 'bg-sky text-ink shadow-soft'
                : 'text-ink-faint hover:text-ink-soft'
            }`}
        >
          {copy.onboarding.gradeNone}
        </button>
      </section>

      <div className="mt-10 flex justify-center pb-4">
        <PrimaryButton onClick={submit} tone="coral" disabled={!ready}>
          {copy.common.next}
        </PrimaryButton>
      </div>
    </Screen>
  );
}
