export interface Timer {
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  reset: () => void
  getElapsedTime: () => number
  getActiveTime: () => number
  isRunning: () => boolean
  isPaused: () => boolean
}

export function createTimer(): Timer {
  let startTime: number | null = null
  let pausedAt: number | null = null
  let totalPausedTime = 0
  let running = false

  const start = () => {
    if (running) return

    startTime = Date.now()
    pausedAt = null
    totalPausedTime = 0
    running = true
  }

  const pause = () => {
    if (!running || pausedAt !== null) return

    pausedAt = Date.now()
  }

  const resume = () => {
    if (!running || pausedAt === null) return

    totalPausedTime += Date.now() - pausedAt
    pausedAt = null
  }

  const stop = () => {
    running = false
    pausedAt = null
  }

  const reset = () => {
    startTime = null
    pausedAt = null
    totalPausedTime = 0
    running = false
  }

  const getElapsedTime = (): number => {
    if (!startTime) return 0

    const now = Date.now()
    return now - startTime
  }

  const getActiveTime = (): number => {
    if (!startTime) return 0

    const elapsed = getElapsedTime()
    const currentPausedTime = pausedAt ? Date.now() - pausedAt : 0
    return elapsed - totalPausedTime - currentPausedTime
  }

  const isRunning = () => running
  const isPaused = () => running && pausedAt !== null

  return {
    start,
    pause,
    resume,
    stop,
    reset,
    getElapsedTime,
    getActiveTime,
    isRunning,
    isPaused
  }
}