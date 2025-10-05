import { ref, onMounted, onUnmounted, inject } from 'vue'
import type { TaskCorrectness } from './types'
import type { TaskCompletionData } from '@/entities/practice-tracking/TaskCompletionData'
import type { PracticeTrackingRepoContract } from '@/entities/practice-tracking/PracticeTrackingRepoContract'
import { TRACKING_CONFIG } from './trackingConfig'
import { createActivityTracker } from '@/shared/utils/activityDetection'
import { createTimer } from '@/shared/utils/timerUtils'

export function useDetailedPracticeTracking() {
  const repo = inject<PracticeTrackingRepoContract>('practiceTrackingRepo')!
  if (!repo) {
    throw new Error('PracticeTrackingRepo not provided')
  }

  // Current session state
  const sessionId = ref<string>(generateSessionId())
  const currentTimer = ref(createTimer())
  const inactivityTimer = ref<NodeJS.Timeout | null>(null)

  // Activity tracking
  const activityTracker = createActivityTracker(
    TRACKING_CONFIG.ACTIVITY_EVENTS,
    handleActivity
  )

  function handleActivity() {
    if (currentTimer.value.isPaused()) {
      currentTimer.value.resume()
    }
    resetInactivityTimer()
  }

  function resetInactivityTimer() {
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
    }

    inactivityTimer.value = setTimeout(() => {
      if (currentTimer.value.isRunning()) {
        currentTimer.value.pause()
      }
    }, TRACKING_CONFIG.INACTIVITY_THRESHOLD)
  }

  function startTaskTiming() {
    currentTimer.value.reset()
    currentTimer.value.start()
    resetInactivityTimer()
  }

  function stopTaskTiming(): number {
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
      inactivityTimer.value = null
    }

    const activeTime = currentTimer.value.getActiveTime()
    currentTimer.value.stop()

    // Cap at maximum duration
    return Math.min(activeTime, TRACKING_CONFIG.MAX_TASK_DURATION)
  }

  async function recordTaskCompletion(
    setId: string | null,
    languageCode: string,
    practiceMode: string,
    taskType: string,
    correctness: TaskCorrectness
  ) {
    const activeDuration = stopTaskTiming()

    const event: Omit<TaskCompletionData, 'id'> = {
      timestamp: new Date(),
      activeDuration,
      set_Id: setId,
      language_code: languageCode,
      practice_mode: practiceMode,
      task_type: taskType,
      correctness,
      session_id: sessionId.value
    }

    await repo.saveCompletionEvent(event)
  }

  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  function onVisibilityChange() {
    if (document.hidden) {
      if (currentTimer.value.isRunning()) {
        currentTimer.value.pause()
      }
    } else {
      if (currentTimer.value.isPaused()) {
        currentTimer.value.resume()
        resetInactivityTimer()
      }
    }
  }

  // Analytics functions
  async function getTodayMinutes(): Promise<number> {
    const events = await repo.getTodayEvents()
    return events.reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  async function getThisWeekMinutes(): Promise<number> {
    const events = await repo.getThisWeekEvents()
    return events.reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  async function getTotalMinutes(): Promise<number> {
    const events = await repo.getAllCompletionEvents()
    return events.reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  async function getTimeByLanguage(languageCode: string): Promise<number> {
    const events = await repo.getEventsByLanguage(languageCode)
    return events.reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  async function getTimeByPracticeMode(practiceMode: string): Promise<number> {
    const events = await repo.getEventsByPracticeMode(practiceMode)
    return events.reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getAllCompletionEvents(): Promise<TaskCompletionData[]> {
    return repo.getAllCompletionEvents()
  }

  onMounted(() => {
    activityTracker.startTracking()
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (inactivityTimer.value) {
      clearTimeout(inactivityTimer.value)
    }
    activityTracker.stopTracking()
    document.removeEventListener('visibilitychange', onVisibilityChange)
    currentTimer.value.stop()
  })

  return {
    // Task timing
    startTaskTiming,
    recordTaskCompletion,

    // Analytics (backward compatible)
    getTodayMinutes,
    getThisWeekMinutes,
    getTotalMinutes,

    // New analytics
    getTimeByLanguage,
    getTimeByPracticeMode,
    getAllCompletionEvents
  }
}