import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../state/store';
import { KEEPSAKES } from '../world/scenes/brygga.chapter';

/**
 * The journal.
 *
 * What the child has met, drawn as pictures rather than listed as entries. It
 * is not a collection screen: there is no counter, no percentage and no empty
 * slot labelled "???" — a card the child has not earned yet is a quiet empty
 * frame, so the page has a shape from the first visit and nothing in it reads
 * as something missing.
 *
 * This screen also closes a real hole. The chapter interface has always had a
 * journal button, and until now it navigated to a route that did not exist,
 * which sent the child through the catch-all redirect and out to the splash
 * screen — the one tap in the harbour that threw them out of the game.
 */

interface Card {
  id: string;
  title: string;
  note: string;
  asset: string;
}

const CARDS: Card[] = [
  {
    id: KEEPSAKES.milla,
    title: 'Milla',
    note: 'En måke på brygga. Hun samler skjell i en kurv.',
    asset: 'assets/worlds/brygga/journal/milla.png',
  },
  {
    id: KEEPSAKES.shells,
    title: 'Tre skjell',
    note: 'Tre skjell fra stien, og en full kurv.',
    asset: 'assets/worlds/brygga/journal/skjell.png',
  },
];

export function Dagbok() {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { keepsakes } = useGame();

  return (
    <div className="min-h-screen w-full bg-cream">
      <div className="mx-auto w-full max-w-md px-5 pb-16 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-title font-bold text-ink">Dagboka</h1>
          <button
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-xl
              bg-snow shadow-soft"
            aria-label="Tilbake"
          >
            <img
              src="assets/ui/home.png"
              alt=""
              aria-hidden
              className="h-6 w-6 object-contain"
            />
          </button>
        </div>

        <p className="pt-2 font-text text-body text-ink-soft">
          Her er det du har møtt på Læreøya.
        </p>

        <div className="grid gap-4 pt-6">
          {CARDS.map((card, i) => {
            const earned = keepsakes.includes(card.id);
            return (
              <motion.article
                key={card.id}
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.07, duration: 0.35 }}
                className="overflow-hidden rounded-2xl bg-snow shadow-soft"
                aria-label={earned ? card.title : 'Ikke funnet ennå'}
              >
                <div className="flex h-40 items-center justify-center bg-sand">
                  {earned ? (
                    <img
                      src={card.asset}
                      alt={card.title}
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    // Empty, not locked. Nothing here says the child failed to
                    // get something — the frame is simply still waiting.
                    <span
                      className="font-display text-lead text-ink-faint"
                      aria-hidden
                    >
                      ·
                    </span>
                  )}
                </div>
                <div className="px-4 py-3">
                  <h2 className="font-display text-lead font-semibold text-ink">
                    {earned ? card.title : 'Ikke funnet ennå'}
                  </h2>
                  {earned && (
                    <p className="pt-1 font-text text-body text-ink-soft">{card.note}</p>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
