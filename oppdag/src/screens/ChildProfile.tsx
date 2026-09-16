import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { BackButton } from '../design/BackButton';
import { SoftCard } from '../design/SoftCard';
import { Character } from '../characters/Character';
import { TONES } from '../design/tones';
import { getInterest } from '../data/interests';
import { LOCATIONS, SCENERY, type SceneryId } from '../world/worldLayout';
import { ADVENTURES_BY_ID } from '../data/adventures';
import { useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * "Meg".
 *
 * The child's own page — what they like, what their world looks like now, what
 * they've been on and what they've drawn. Note what is absent: no score, no
 * level, no streak, no comparison to anybody else.
 */
export function ChildProfile() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { profile, unlocked, adventures, drawings } = useGame();

  const openPlaces = LOCATIONS.filter((l) => unlocked.includes(l.id));
  const grownThings = (Object.keys(SCENERY) as SceneryId[]).filter((id) =>
    unlocked.includes(id),
  );
  const done = Object.values(adventures).filter(
    (a) => a.completedAt && ADVENTURES_BY_ID[a.adventureId],
  );

  return (
    <Screen
      backdrop={<Backdrop kind="hills" />}
      width="narrow"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/verden')} />
        </div>
      }
    >
      <header className="mt-14 flex flex-col items-center text-center sm:mt-10">
        <Character who="lumi" mood="happy" size={130} />
        <h1 className="mt-2 text-huge leading-tight text-ink md:text-giant">
          {profile?.name}
        </h1>
        <p className="mt-1 text-body text-ink-soft">
          {profile ? copy.profile.age(profile.age) : ''}
          {profile?.grade ? ` · ${copy.profile.grade(profile.grade)}` : ''}
        </p>
      </header>

      {/* Interests */}
      <SoftCard className="mt-8">
        <h2 className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {copy.profile.interests}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {(profile?.interests ?? []).map((id) => {
            const interest = getInterest(id);
            if (!interest) return null;
            return (
              <span
                key={id}
                className={`flex items-center gap-2 rounded-full ${TONES[interest.tone].soft}
                  px-4 py-2.5 font-display text-body font-semibold text-ink`}
              >
                <span aria-hidden>{interest.emoji}</span>
                {interest.label}
              </span>
            );
          })}
        </div>
      </SoftCard>

      {/* The world so far */}
      <SoftCard className="mt-4">
        <h2 className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {copy.profile.worldTitle}
        </h2>
        <p className="mt-2 font-display text-lead font-semibold text-ink">
          {copy.profile.worldCount(openPlaces.length, LOCATIONS.length)}
        </p>

        <div className="mt-4 flex flex-wrap gap-2.5">
          {openPlaces.map((place) => (
            <span
              key={place.id}
              className={`flex items-center gap-2 rounded-full ${TONES[place.tone].soft}
                px-4 py-2.5 font-display text-body font-semibold text-ink`}
            >
              <span aria-hidden>{place.emoji}</span>
              {place.name}
            </span>
          ))}
        </div>

        {grownThings.length > 0 && (
          <div className="mt-5 flex flex-col gap-2.5">
            {grownThings.map((id, i) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-md bg-sand px-4 py-3"
              >
                <span className="text-lead" aria-hidden>
                  {SCENERY[id].emoji}
                </span>
                <div className="min-w-0">
                  <p className="font-display text-body font-semibold text-ink">
                    {SCENERY[id].name}
                  </p>
                  <p className="text-label text-ink-soft">{SCENERY[id].because}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </SoftCard>

      {/* Adventures */}
      <SoftCard className="mt-4">
        <h2 className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {copy.profile.adventuresTitle}
        </h2>
        {done.length === 0 ? (
          <p className="mt-3 text-body text-ink-faint">{copy.profile.noAdventures}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2.5">
            {done.map((entry) => {
              const adventure = ADVENTURES_BY_ID[entry.adventureId]!;
              return (
                <li
                  key={entry.adventureId}
                  className="flex items-center gap-3 rounded-md bg-moss-soft/60 px-4 py-3"
                >
                  <span className="text-lead" aria-hidden>
                    {adventure.emoji}
                  </span>
                  <span className="font-display text-body font-semibold text-ink">
                    {adventure.title}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SoftCard>

      {/* Drawings */}
      <SoftCard className="mt-4 mb-8">
        <h2 className="font-display text-label font-semibold uppercase tracking-[0.13em] text-ink-faint">
          {copy.profile.drawingsTitle}
        </h2>
        {drawings.length === 0 ? (
          <p className="mt-3 text-body text-ink-faint">{copy.profile.noDrawings}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[...drawings].reverse().map((drawing) => (
              <img
                key={drawing.id}
                src={drawing.dataUrl}
                alt={drawing.prompt}
                className="w-full rounded-md shadow-soft"
              />
            ))}
          </div>
        )}
      </SoftCard>
    </Screen>
  );
}
