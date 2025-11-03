import { openAIService } from './OpenAIService';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export interface BuildingBlock {
  phrase: string;
  meaning: string;
  type: 'expression' | 'noun' | 'verb' | 'adjective' | 'other';
}

export interface GoalAnalysisResult {
  coreSentences: string[];
  buildingBlocks: BuildingBlock[];
}

export class GoalAnalysisAgent {
  async analyze(goal: string, language: string): Promise<GoalAnalysisResult> {
    const model = openAIService.createChatModel({ temperature: 0.3 });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a language learning expert. Analyze the user's learning goal and identify:
1. 3-5 core sentences they need to master to achieve this goal
2. Key building blocks (phrases, words, expressions) that make up these sentences

Focus on practical, high-frequency expressions. For each building block, identify its type and provide a clear English translation.

Return your analysis as JSON matching this exact structure:
{{
  "coreSentences": ["sentence 1", "sentence 2", ...],
  "buildingBlocks": [
    {{ "phrase": "the phrase", "meaning": "English translation", "type": "expression|noun|verb|adjective|other" }},
    ...
  ]
}}

Rules:
- Core sentences should be practical and immediately useful
- Building blocks should decompose sentences into learnable chunks
- Avoid overly complex grammar for beginners
- Focus on conversational language
- All target language content must be in {language} using the NATIVE SCRIPT of that language
- For Arabic: use Arabic script (العربية), NOT romanization/transliteration/Franco
- For Mandarin: use Chinese characters (汉字), NOT pinyin
- For any language with a non-Latin script: use that script, NOT Latin transliteration
- All meanings/translations must be in English
- Do NOT include transliterations or romanizations in the output`],
      ['user', 'Learning goal: {goal}\nTarget language: {language}']
    ]);

    const parser = new JsonOutputParser<GoalAnalysisResult>();
    const chain = prompt.pipe(model).pipe(parser);

    const result = await chain.invoke({ goal, language });

    // Validate the result structure
    if (!result.coreSentences || !Array.isArray(result.coreSentences)) {
      throw new Error('Invalid AI response: missing coreSentences array');
    }
    if (!result.buildingBlocks || !Array.isArray(result.buildingBlocks)) {
      throw new Error('Invalid AI response: missing buildingBlocks array');
    }

    return result;
  }
}

export const goalAnalysisAgent = new GoalAnalysisAgent();
