const PROFILE_KEY = 'brocode_profile'
const SEEN_KEY = 'brocode_seen'
const NOTIF_KEY = 'brocode_notif_asked'
const ALERT_DISMISS_KEY = 'brocode_alerts_dismissed'

function safeParse(json) {
  try { return JSON.parse(json) } catch { return null }
}

export function loadProfile() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  return safeParse(raw)
}

export function saveProfile(profile) {
  if (typeof window === 'undefined') return
  const stamped = { ...profile, updatedAt: new Date().toISOString() }
  if (!stamped.createdAt) stamped.createdAt = stamped.updatedAt
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(stamped))
  return stamped
}

export function clearProfile() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(PROFILE_KEY)
}

export function exportProfileFile() {
  const profile = loadProfile()
  if (!profile) return
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `brocode-profile-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importProfileFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const data = safeParse(reader.result)
      if (!data || !data.lastPeriod) {
        reject(new Error('Invalid profile file'))
        return
      }
      const saved = saveProfile(data)
      resolve(saved)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export function hasSeenWelcome() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(SEEN_KEY) === '1'
}

export function markWelcomeSeen() {
  window.localStorage.setItem(SEEN_KEY, '1')
}

export function hasAskedNotif() {
  if (typeof window === 'undefined') return true
  return window.localStorage.getItem(NOTIF_KEY) === '1'
}

export function markNotifAsked() {
  window.localStorage.setItem(NOTIF_KEY, '1')
}

export function isAlertDismissed(id) {
  if (typeof window === 'undefined') return false
  const today = new Date().toISOString().slice(0, 10)
  const raw = window.localStorage.getItem(ALERT_DISMISS_KEY)
  const map = safeParse(raw) || {}
  return map[today] && map[today].includes(id)
}

export function dismissAlert(id) {
  const today = new Date().toISOString().slice(0, 10)
  const raw = window.localStorage.getItem(ALERT_DISMISS_KEY)
  const map = safeParse(raw) || {}
  // prune entries older than 3 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 3)
  const cutoffKey = cutoff.toISOString().slice(0, 10)
  for (const k of Object.keys(map)) {
    if (k < cutoffKey) delete map[k]
  }
  if (!map[today]) map[today] = []
  if (!map[today].includes(id)) map[today].push(id)
  window.localStorage.setItem(ALERT_DISMISS_KEY, JSON.stringify(map))
}

// Tiny debounce helper for auto-save
export function debounce(fn, wait = 500) {
  let t
  return function (...args) {
    clearTimeout(t)
    t = setTimeout(() => fn.apply(this, args), wait)
  }
}
