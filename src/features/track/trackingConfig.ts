export const TRACKING_CONFIG = {
  // Storage keys
  STORAGE_KEY: 'linguanodon-practice-tracking',

  // Timing thresholds
  INACTIVITY_THRESHOLD: 20 * 1000, // 20 seconds
  MAX_TASK_DURATION: 15 * 60 * 1000, // 15 minutes

  // Activity detection events
  ACTIVITY_EVENTS: [
    'mousemove',
    'keydown',
    'click',
    'scroll'
  ] as const,

  // Data retention
  MAX_EVENTS_TO_STORE: 10000, // Prevent unbounded growth
  CLEANUP_OLDER_THAN_DAYS: 365
} as const

export type ActivityEvent = typeof TRACKING_CONFIG.ACTIVITY_EVENTS[number]