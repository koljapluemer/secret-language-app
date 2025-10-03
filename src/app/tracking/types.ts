export interface TaskCompletionEvent {
  timestamp: Date
  activeDuration: number // milliseconds of active time only (excluding inactivity)
  set_Id: string | null // from vocab.origins or practice mode context
  language_code: string // from task.language
  practice_mode: string // practice mode identifier
  task_type: string // from task.taskType
  correctness: 'correct' | 'incorrect' | 'neutral'
  session_id: string // to group related completions
}

export interface PracticeTrackingData {
  completionEvents: TaskCompletionEvent[]
  currentSessionId: string | null
}

export interface PracticeContext {
  practiceMode: string
  setId?: string | null
  [key: string]: unknown // Allow additional context
}

export type TaskCorrectness = 'correct' | 'incorrect' | 'neutral'