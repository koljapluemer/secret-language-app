// Test configuration for different test types
export type TestConfig =
  | { type: 'vocab-based'; setId: string; testType: 'seen' | 'all'; mode: string }
  | { type: 'resource-based'; resourceId: string; mode: string };

// Individual task result for vocab-based tests
export interface TestTaskResult {
  taskId: string;
  vocabIds: string[];
  correct: boolean;
}

// Result for resource consumption tests
export interface ConsumeResourceResult {
  resourceId: string;
  experienceNote?: string; // Free-text note content
}

// Main test result data
export interface TestResultData {
  id: string;

  // Test metadata
  testMode: string; // e.g., 'minimal-pairs', 'consume-resource'
  completedAt: Date;
  durationMs?: number; // Test duration in milliseconds

  // Test configuration (for rerun)
  testConfig: TestConfig;

  // Results (different structure for different test types)
  results: TestTaskResult[] | ConsumeResourceResult;
}
