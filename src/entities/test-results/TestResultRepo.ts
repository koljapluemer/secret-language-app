import type { TestResultRepoContract } from './TestResultRepoContract';
import type { TestResultData } from './TestResultData';
import { db } from '@/shared/database/db';
import { nanoid } from 'nanoid';

export class TestResultRepo implements TestResultRepoContract {
  async saveTestResult(result: Omit<TestResultData, 'id'>): Promise<TestResultData> {
    const testResult: TestResultData = {
      id: nanoid(),
      testMode: result.testMode,
      completedAt: result.completedAt,
      durationMs: result.durationMs,
      testConfig: result.testConfig,
      results: result.results
    };

    await db.testResults.add(testResult);
    return testResult;
  }

  async getTestResultById(id: string): Promise<TestResultData | undefined> {
    return await db.testResults.get(id);
  }

  async deleteTestResult(id: string): Promise<void> {
    await db.testResults.delete(id);
  }

  async getTestResultsPaginated(offset: number, limit: number): Promise<TestResultData[]> {
    return await db.testResults
      .orderBy('completedAt')
      .reverse() // Most recent first
      .offset(offset)
      .limit(limit)
      .toArray();
  }

  async getTotalTestResultsCount(): Promise<number> {
    return await db.testResults.count();
  }

  async getTestResultsByMode(mode: string): Promise<TestResultData[]> {
    return await db.testResults
      .where('testMode')
      .equals(mode)
      .reverse()
      .sortBy('completedAt');
  }
}
