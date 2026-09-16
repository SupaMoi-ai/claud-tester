import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useGame } from './state/store';

import { Splash } from './screens/Splash';
import { ParentSetup } from './screens/ParentSetup';
import { OnboardingName } from './screens/OnboardingName';
import { OnboardingAge } from './screens/OnboardingAge';
import { OnboardingInterests } from './screens/OnboardingInterests';
import { LearningCheck } from './screens/LearningCheck';
import { Home } from './screens/Home';
import { AdventureIntro } from './screens/AdventureIntro';
import { AdventurePlay } from './screens/AdventurePlay';
import { AdventureComplete } from './screens/AdventureComplete';
import { Discoveries } from './screens/Discoveries';
import { ChildProfile } from './screens/ChildProfile';
import { ParentGate } from './screens/ParentGate';
import { ParentDashboard } from './screens/ParentDashboard';
import { LearningMap } from './screens/LearningMap';

/**
 * Keeps a child who hasn't been through onboarding from landing somewhere
 * confusing — e.g. a bookmarked world URL on a fresh device.
 */
function RequireProfile({ children }: { children: React.ReactElement }) {
  const { profile } = useGame();
  return profile ? children : <Navigate to="/" replace />;
}

export function App() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Splash />} />
        <Route path="/foreldre/oppsett" element={<ParentSetup />} />
        <Route path="/hei" element={<OnboardingName />} />
        <Route path="/alder" element={<OnboardingAge />} />
        <Route path="/nysgjerrig" element={<OnboardingInterests />} />
        <Route path="/sjekk" element={<LearningCheck />} />

        <Route
          path="/verden"
          element={
            <RequireProfile>
              <Home />
            </RequireProfile>
          }
        />
        <Route
          path="/eventyr/:id"
          element={
            <RequireProfile>
              <AdventureIntro />
            </RequireProfile>
          }
        />
        <Route
          path="/eventyr/:id/spill"
          element={
            <RequireProfile>
              <AdventurePlay />
            </RequireProfile>
          }
        />
        <Route
          path="/eventyr/:id/ferdig"
          element={
            <RequireProfile>
              <AdventureComplete />
            </RequireProfile>
          }
        />
        <Route
          path="/oppdagelser"
          element={
            <RequireProfile>
              <Discoveries />
            </RequireProfile>
          }
        />
        <Route
          path="/meg"
          element={
            <RequireProfile>
              <ChildProfile />
            </RequireProfile>
          }
        />

        <Route path="/port" element={<ParentGate />} />
        <Route path="/foreldre" element={<ParentDashboard />} />
        <Route path="/foreldre/kart" element={<LearningMap />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
