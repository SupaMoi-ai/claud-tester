import { hasAskedNotif, markNotifAsked } from './storage.js'
import { calculateCycleDay, calculatePhase, getDaysUntilNextPeriod } from './cycle.js'

export function requestNotificationPermissionOnce() {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (hasAskedNotif()) return
  if (Notification.permission !== 'default') {
    markNotifAsked()
    return
  }
  // Defer until first user interaction so the prompt isn't blocked.
  const ask = () => {
    markNotifAsked()
    try {
      Notification.requestPermission()
    } catch {
      /* ignore */
    }
    window.removeEventListener('click', ask)
    window.removeEventListener('keydown', ask)
  }
  window.addEventListener('click', ask, { once: true })
  window.addEventListener('keydown', ask, { once: true })
}

export function buildNotificationMessage(profile) {
  if (!profile) return null
  const day = calculateCycleDay(profile)
  const phase = calculatePhase(day, profile.cycleLength)
  const daysUntil = getDaysUntilNextPeriod(profile)
  if (daysUntil <= 3 && daysUntil > 0) {
    return { title: 'BRO CODE 🩸', body: `Period in ${daysUntil} days. Stock up today.` }
  }
  if (daysUntil === 0 || day === 1) {
    return { title: 'BRO CODE 🩸', body: 'Day 1. She needs you.' }
  }
  if (phase === 'ovulation' && day && day <= 17) {
    return { title: 'BRO CODE ⭐', body: "She's in her power window. Match that energy." }
  }
  if (phase === 'luteal') {
    return { title: 'BRO CODE 🌙', body: 'Luteal mode. Less plans, more presence.' }
  }
  return null
}

let scheduled = false
export function scheduleDailyNotification(getProfile) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  if (scheduled) return
  scheduled = true

  const fire = () => {
    const profile = getProfile?.()
    const msg = buildNotificationMessage(profile)
    if (msg) {
      try {
        new Notification(msg.title, { body: msg.body })
      } catch {
        /* ignore */
      }
    }
    schedule()
  }

  const schedule = () => {
    const now = new Date()
    const next = new Date(now)
    next.setHours(8, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const ms = next - now
    setTimeout(fire, ms)
  }

  schedule()
}
