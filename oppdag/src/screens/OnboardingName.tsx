import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { BackButton } from '../design/BackButton';
import { CharacterBubble } from '../characters/CharacterBubble';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

export function OnboardingName() {
  const copy = useCopy();
  const navigate = useNavigate();
  const actions = useActions();
  const { profile } = useGame();
  const [name, setName] = useState(profile?.name ?? '');

  const ready = name.trim().length > 0;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ready) return;
    actions.createProfile(name, profile?.age ?? 8, profile?.grade ?? null);
    navigate('/alder');
  };

  return (
    <Screen
      backdrop={<Backdrop kind="hills" />}
      center
      width="narrow"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/')} />
        </div>
      }
    >
      <CharacterBubble who="lumi" mood="happy" size={170} speechKey="name">
        {copy.onboarding.nameTitle}
      </CharacterBubble>

      <form onSubmit={submit} className="mx-auto mt-8 w-full max-w-md">
        <label htmlFor="child-name" className="sr-only">
          {copy.onboarding.nameHint}
        </label>
        <input
          id="child-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={copy.onboarding.namePlaceholder}
          autoComplete="off"
          autoFocus
          maxLength={20}
          className="w-full rounded-lg bg-snow px-6 py-5 text-center font-display text-huge
            font-semibold text-ink shadow-soft outline-none placeholder:text-ink-faint/60
            focus:shadow-lifted"
        />

        <div className="mt-6 flex justify-center">
          <PrimaryButton type="submit" tone="coral" disabled={!ready}>
            {copy.onboarding.nameCta}
          </PrimaryButton>
        </div>
      </form>
    </Screen>
  );
}
