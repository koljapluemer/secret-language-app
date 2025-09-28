export interface ActivityTracker {
  startTracking: () => void
  stopTracking: () => void
  isTracking: () => boolean
  getLastActivityTime: () => number | null
}

export function createActivityTracker(
  events: readonly string[],
  onActivity: () => void
): ActivityTracker {
  let isActive = false
  let lastActivityTime: number | null = null

  const handleActivity = () => {
    lastActivityTime = Date.now()
    onActivity()
  }

  const startTracking = () => {
    if (isActive) return

    isActive = true
    lastActivityTime = Date.now()

    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })
  }

  const stopTracking = () => {
    if (!isActive) return

    isActive = false
    lastActivityTime = null

    events.forEach(event => {
      document.removeEventListener(event, handleActivity)
    })
  }

  const getLastActivityTime = () => lastActivityTime
  const getIsTracking = () => isActive

  return {
    startTracking,
    stopTracking,
    isTracking: getIsTracking,
    getLastActivityTime
  }
}