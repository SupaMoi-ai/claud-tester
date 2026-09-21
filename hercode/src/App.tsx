import { useState } from 'react';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import type { CapacityLevel, Task } from './domain/types';
import { AIHelperButton } from './features/ai/AIHelperButton';
import { AISheet, type AIRequest } from './features/ai/AISheet';
import { BrainScreen } from './features/brain/BrainScreen';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import { MorningCheckIn } from './features/today/MorningCheckIn';
import { OverwhelmSheet } from './features/today/OverwhelmSheet';
import { TodayScreen } from './features/today/TodayScreen';
import { useHerCode } from './store/useHerCode';

export default function App() {
  const onboarded = useHerCode((s) => s.profile.onboarded);
  const activeTab = useHerCode((s) => s.ui.activeTab);
  const setActiveTab = useHerCode((s) => s.setActiveTab);
  const checkInSeenFor = useHerCode((s) => s.ui.checkInSeenFor);
  const checkIns = useHerCode((s) => s.checkIns);
  const capacityByDay = useHerCode((s) => s.capacityByDay);
  const tasks = useHerCode((s) => s.tasks);
  const setCapacity = useHerCode((s) => s.setCapacity);
  const setTaskSteps = useHerCode((s) => s.setTaskSteps);
  const snoozeTask = useHerCode((s) => s.snoozeTask);
  const today = useHerCode((s) => s.today)();

  const [overwhelmOpen, setOverwhelmOpen] = useState(false);
  const [aiRequest, setAiRequest] = useState<AIRequest | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const capacity: CapacityLevel = capacityByDay[today] ?? checkIns[today]?.capacity ?? 'normal';

  // The check-in is offered once a day, and only after onboarding is out of the way.
  const checkInOpen = onboarded && !checkIns[today] && checkInSeenFor !== today;

  const openAI = (request: AIRequest | null) => {
    setAiRequest(request);
    setAiOpen(true);
  };

  const askAboutTask = (task: Task) => openAI({ intent: 'break-down', task });

  return (
    <PhoneFrame>
      {!onboarded ? (
        <OnboardingFlow />
      ) : (
        <>
          <main className="min-h-0 flex-1">
            {activeTab === 'today' ? (
              <TodayScreen
                onOverwhelmed={() => setOverwhelmOpen(true)}
                onOpenCapacity={() => setOverwhelmOpen(true)}
                onCantStart={askAboutTask}
              />
            ) : (
              <BrainScreen />
            )}
          </main>

          <AIHelperButton onClick={() => openAI(null)} />
          <TabBar active={activeTab} onChange={setActiveTab} />

          <MorningCheckIn open={checkInOpen} date={today} />

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
            screen={activeTab}
            capacity={capacity}
            tasks={tasks.filter((t) => t.date === today)}
            onKeepSteps={setTaskSteps}
            onMoveTask={(id) => snoozeTask(id, 'tomorrow')}
          />
        </>
      )}
    </PhoneFrame>
  );
}
