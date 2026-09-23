import { useState } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { projectForPartner } from './domain/projectForPartner';
import type { CapacityLevel, Task } from './domain/types';
import { AIHelperButton } from './features/ai/AIHelperButton';
import { AISheet, type AIRequest } from './features/ai/AISheet';
import { BrainScreen } from './features/brain/BrainScreen';
import { MeScreen } from './features/me/MeScreen';
import { PrivacyOverviewScreen } from './features/me/PrivacyOverviewScreen';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { BroCodePreview } from './features/partner/BroCodePreview';
import { DecisionLoadScreen } from './features/partner/DecisionLoadScreen';
import { PartnerSetupScreen } from './features/partner/PartnerSetupScreen';
import { PatternsScreen } from './features/patterns/PatternsScreen';
import { DailyReview } from './features/review/DailyReview';
import { MorningCheckIn } from './features/today/MorningCheckIn';
import { OverwhelmSheet } from './features/today/OverwhelmSheet';
import { TodayScreen } from './features/today/TodayScreen';
import { useHerCode } from './store/useHerCode';

/**
 * The AI helper belongs where there is something to plan. Patterns is for
 * reading, and a floating button there only covers the cards.
 */
const HELPER_TABS = new Set(['today', 'brain']);

export default function App() {
  const state = useHerCode();
  const {
    profile,
    ui,
    checkIns,
    capacityByDay,
    tasks,
    setActiveTab,
    setMeRoute,
    setCapacity,
    setTaskSteps,
    snoozeTask,
  } = state;
  const today = state.today();

  const [overwhelmOpen, setOverwhelmOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState<AIRequest | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const capacity: CapacityLevel = capacityByDay[today] ?? checkIns[today]?.capacity ?? 'normal';

  // The check-in is offered once a day, and only after onboarding is done.
  const checkInOpen = profile.onboarded && !checkIns[today] && ui.checkInSeenFor !== today;

  const openAI = (request: AIRequest | null) => {
    setAiRequest(request);
    setAiOpen(true);
  };

  const askAboutTask = (task: Task) => openAI({ intent: 'break-down', task });

  if (!profile.onboarded) {
    return (
      <PhoneFrame>
        <OnboardingFlow />
      </PhoneFrame>
    );
  }

  const showHelper = HELPER_TABS.has(ui.activeTab);

  return (
    <PhoneFrame>
      <main className="min-h-0 flex-1">
        {ui.activeTab === 'today' ? (
          <TodayScreen
            onOverwhelmed={() => setOverwhelmOpen(true)}
            onOpenCapacity={() => setOverwhelmOpen(true)}
            onCantStart={askAboutTask}
            onWrapUpDay={() => setReviewOpen(true)}
          />
        ) : null}

        {ui.activeTab === 'brain' ? <BrainScreen /> : null}
        {ui.activeTab === 'patterns' ? <PatternsScreen /> : null}

        {ui.activeTab === 'me' ? (
          <>
            {ui.meRoute === 'root' ? (
              <MeScreen onNavigate={setMeRoute} onWrapUpDay={() => setReviewOpen(true)} />
            ) : null}

            {ui.meRoute === 'partner' ? (
              <PartnerSetupScreen
                onBack={() => setMeRoute('root')}
                onOpenBroCode={() => setMeRoute('brocode')}
              />
            ) : null}

            {ui.meRoute === 'brocode' ? (
              // projectForPartner is the only thing BroCode ever sees.
              <BroCodePreview
                projection={projectForPartner(state, today)}
                onBack={() => setMeRoute('partner')}
                onManageSharing={() => setMeRoute('partner')}
              />
            ) : null}

            {ui.meRoute === 'decisions' ? (
              <DecisionLoadScreen onBack={() => setMeRoute('root')} />
            ) : null}

            {ui.meRoute === 'privacy' ? (
              <PrivacyOverviewScreen
                onBack={() => setMeRoute('root')}
                onManageSharing={() => setMeRoute('partner')}
              />
            ) : null}
          </>
        ) : null}
      </main>

      {showHelper ? <AIHelperButton onClick={() => openAI(null)} /> : null}
      <TabBar active={ui.activeTab} onChange={setActiveTab} />

      <MorningCheckIn open={checkInOpen} date={today} />

      <DailyReview open={reviewOpen} onOpenChange={setReviewOpen} date={today} />

      <OverwhelmSheet
        open={overwhelmOpen}
        onOpenChange={setOverwhelmOpen}
        capacity={capacity}
        onChoose={(next) => setCapacity(today, next)}
      />

      <AISheet
        open={aiOpen}
        onOpenChange={setAiOpen}
        request={aiRequest}
        screen={ui.activeTab}
        capacity={capacity}
        tasks={tasks.filter((t) => t.date === today)}
        onKeepSteps={setTaskSteps}
        onMoveTask={(id) => snoozeTask(id, 'tomorrow')}
      />
    </PhoneFrame>
  );
}
