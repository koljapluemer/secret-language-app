import type { TestResultData } from './TestResultData';

export interface TestResultRepoContract {
  // CRUD operations
  saveTestResult(result: Omit<TestResultData, 'id'>): Promise<TestResultData>;
  getTestResultById(id: string): Promise<TestResultData | undefined>;
  deleteTestResult(id: string): Promise<void>;

  // Pagination for history view
  getTestResultsPaginated(offset: number, limit: number): Promise<TestResultData[]>;
  getTotalTestResultsCount(): Promise<number>;

  // Query operations
  getTestResultsByMode(mode: string): Promise<TestResultData[]>;
}
