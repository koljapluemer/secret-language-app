import { ref, onMounted, onUnmounted } from 'vue'
import type { TaskCompletionEvent, PracticeTrackingData, TaskCorrectness } from './types'
import { TRACKING_CONFIG } from './trackingConfig'
import { createActivityTracker } from '@/shared/utils/activityDetection'
import { createTimer } from '@/shared/utils/timerUtils'

export function useDetailedPracticeTracking() {
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

  function recordTaskCompletion(
    setUid: string | null,
    languageCode: string,
    practiceMode: string,
    taskType: string,
    correctness: TaskCorrectness
  ) {
    const activeDuration = stopTaskTiming()

    const event: TaskCompletionEvent = {
      timestamp: new Date(),
      activeDuration,
      set_uid: setUid,
      language_code: languageCode,
      practice_mode: practiceMode,
      task_type: taskType,
      correctness,
      session_id: sessionId.value
    }

    saveCompletionEvent(event)
  }

  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  function getTrackingData(): PracticeTrackingData {
    const stored = localStorage.getItem(TRACKING_CONFIG.STORAGE_KEY)
    return stored ? JSON.parse(stored) : {
      completionEvents: [],
      currentSessionId: null
    }
  }

  function saveTrackingData(data: PracticeTrackingData) {
    localStorage.setItem(TRACKING_CONFIG.STORAGE_KEY, JSON.stringify(data))
  }

  function saveCompletionEvent(event: TaskCompletionEvent) {
    const data = getTrackingData()
    data.completionEvents.push(event)
    data.currentSessionId = sessionId.value

    // Cleanup old events if needed
    if (data.completionEvents.length > TRACKING_CONFIG.MAX_EVENTS_TO_STORE) {
      data.completionEvents = data.completionEvents.slice(-TRACKING_CONFIG.MAX_EVENTS_TO_STORE)
    }

    saveTrackingData(data)
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
  function getTodayMinutes(): number {
    const data = getTrackingData()
    const today = new Date().toISOString().split('T')[0]

    return data.completionEvents
      .filter(event => event.timestamp.toString().startsWith(today))
      .reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getThisWeekMinutes(): number {
    const data = getTrackingData()
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    return data.completionEvents
      .filter(event => new Date(event.timestamp) >= startOfWeek)
      .reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getTotalMinutes(): number {
    const data = getTrackingData()
    return data.completionEvents
      .reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getTimeByLanguage(languageCode: string): number {
    const data = getTrackingData()
    return data.completionEvents
      .filter(event => event.language_code === languageCode)
      .reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getTimeByPracticeMode(practiceMode: string): number {
    const data = getTrackingData()
    return data.completionEvents
      .filter(event => event.practice_mode === practiceMode)
      .reduce((total, event) => total + event.activeDuration, 0) / (1000 * 60)
  }

  function getAllCompletionEvents(): TaskCompletionEvent[] {
    return getTrackingData().completionEvents
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