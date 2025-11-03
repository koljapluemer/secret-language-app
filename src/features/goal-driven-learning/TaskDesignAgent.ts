import { openAIService } from './OpenAIService';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export interface TaskConfig {
  taskType: string;
  vocabIds: string[];
  prompt: string;
}

export class TaskDesignAgent {
  async designTasks(
    coreSentences: Array<{ id: string; content: string }>,
    buildingBlocks: Array<{ id: string; content: string; meaning: string }>,
    count: number = 12
  ): Promise<TaskConfig[]> {
    const model = openAIService.createChatModel({ temperature: 0.5 });

    // Available task types for vocab (excluding cloze tasks for now - they need special setup)
    const availableTaskTypes = [
      'vocab-try-to-remember',
      'vocab-reveal-target-to-native',
      'vocab-reveal-native-to-target',
      'vocab-choose-from-two-target-to-native',
      'vocab-choose-from-two-native-to-target',
      'vocab-choose-from-four-target-to-native',
      'vocab-choose-from-four-native-to-target'
    ];

    const vocabList = [
      ...coreSentences.map(s => ({ id: s.id, content: s.content, type: 'sentence' })),
      ...buildingBlocks.map(b => ({ id: b.id, content: b.content, meaning: b.meaning, type: 'building_block' }))
    ];

    const systemMessage = `You are a language learning curriculum designer. Design ${count} practice tasks for a learner.

Available task types:
${availableTaskTypes.map(t => `- ${t}`).join('\n')}

Task type descriptions:
- "vocab-try-to-remember": Show target language, user tries to recall meaning
- "vocab-reveal-target-to-native": Show target, reveal English translation
- "vocab-reveal-native-to-target": Show English, reveal target language
- "vocab-choose-from-two-target-to-native": Multiple choice (2 options), target→English
- "vocab-choose-from-two-native-to-target": Multiple choice (2 options), English→target
- "vocab-choose-from-four-target-to-native": Multiple choice (4 options), target→English
- "vocab-choose-from-four-native-to-target": Multiple choice (4 options), English→target

Design principles:
1. Start with easier tasks (reveal, try-to-remember) for new content
2. Progress to harder tasks (multiple choice) as learner advances
3. Mix sentence practice with building block practice
4. Vary task types for engagement
5. Each task uses 1 vocab item (use its ID from the list)
6. DO NOT use cloze tasks - they require special setup not available yet

Return JSON array of exactly ${count} tasks. Use the exact vocab IDs from the list provided.
Example format:
[
  {
    "taskType": "vocab-try-to-remember",
    "vocabIds": ["actual-vocab-id-from-list"],
    "prompt": "What does this mean?"
  }
]`;

    const userMessage = `Available vocabulary:
${JSON.stringify(vocabList, null, 2)}

Design ${count} optimal practice tasks using these exact vocab items.`;

    const parser = new JsonOutputParser<TaskConfig[]>();

    const result = await model.pipe(parser).invoke([
      ['system', systemMessage],
      ['user', userMessage]
    ]);

    // Validate
    if (!Array.isArray(result)) {
      throw new Error('Invalid AI response: expected array of tasks');
    }

    // Ensure we have exactly the requested count
    if (result.length !== count) {
      console.warn(`AI returned ${result.length} tasks instead of ${count}, adjusting...`);
    }

    return result.slice(0, count);
  }
}

export const taskDesignAgent = new TaskDesignAgent();
