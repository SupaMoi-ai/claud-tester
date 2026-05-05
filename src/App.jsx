import { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import Dashboard from './components/Dashboard.jsx'
import Calendar from './components/Calendar.jsx'
import Profile from './components/Profile.jsx'
import Guide from './components/Guide.jsx'
import TheCode from './components/TheCode.jsx'
import WelcomeModal from './components/WelcomeModal.jsx'
import {
  loadProfile,
  hasSeenWelcome,
  markWelcomeSeen,
} from './lib/storage.js'
import {
  requestNotificationPermissionOnce,
  scheduleDailyNotification,
} from './lib/notifications.js'
import {
  calculateCycleDay,
  calculatePhase,
} from './lib/cycle.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'profile', label: 'Her Profile' },
  { id: 'guide', label: 'The Guide' },
  { id: 'code', label: 'The Code' },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profile, setProfile] = useState(() => loadProfile())
  const [showWelcome, setShowWelcome] = useState(() => !hasSeenWelcome())

  const cycleDay = useMemo(() => calculateCycleDay(profile), [profile])
  const phase = useMemo(
    () => calculatePhase(cycleDay, profile?.cycleLength),
    [cycleDay, profile?.cycleLength],
  )

  useEffect(() => {
    requestNotificationPermissionOnce()
  }, [])

  useEffect(() => {
    if (profile) scheduleDailyNotification(() => loadProfile())
  }, [profile])

  const dismissWelcome = () => {
    markWelcomeSeen()
    setShowWelcome(false)
  }

  return (
    <div className="min-h-screen text-cream">
      <Header tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {activeTab === 'dashboard' && (
          <Dashboard
            profile={profile}
            cycleDay={cycleDay}
            phase={phase}
            onGoToProfile={() => setActiveTab('profile')}
            onProfileChange={setProfile}
          />
        )}
        {activeTab === 'calendar' && (
          <Calendar profile={profile} onGoToProfile={() => setActiveTab('profile')} />
        )}
        {activeTab === 'profile' && (
          <Profile profile={profile} onChange={setProfile} />
        )}
        {activeTab === 'guide' && (
          <Guide
            profile={profile}
            currentPhase={phase}
            onGoToProfile={() => setActiveTab('profile')}
          />
        )}
        {activeTab === 'code' && <TheCode />}
      </main>

      <footer className="text-center label py-10 opacity-60">
        BRO CODE · v1.0 · Know the code
      </footer>

      {showWelcome && <WelcomeModal onClose={dismissWelcome} />}
    </div>
  )
}
