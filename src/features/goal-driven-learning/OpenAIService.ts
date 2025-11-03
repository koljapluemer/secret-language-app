import { ChatOpenAI } from '@langchain/openai';

const OPENAI_API_KEY_STORAGE_KEY = 'openai-api-key';

export class OpenAIService {
  private static instance: OpenAIService | null = null;

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService();
    }
    return OpenAIService.instance;
  }

  getApiKey(): string | null {
    return localStorage.getItem(OPENAI_API_KEY_STORAGE_KEY);
  }

  hasApiKey(): boolean {
    const key = this.getApiKey();
    return key !== null && key.trim().length > 0;
  }

  createChatModel(options: { temperature?: number; modelName?: string } = {}): ChatOpenAI {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenAI API key not found. Please set it in Settings.');
    }

    // Debug: Log key info (first few chars only for security)
    console.log('[OpenAIService] API key exists:', !!apiKey, 'length:', apiKey.length, 'starts with:', apiKey.substring(0, 7));

    // Try BOTH apiKey and openAIApiKey (they're aliases but let's be explicit)
    const config = {
      apiKey: apiKey,
      openAIApiKey: apiKey,
      modelName: options.modelName || 'gpt-4',
      temperature: options.temperature ?? 0.7,
      maxTokens: 4000
    };

    console.log('[OpenAIService] ChatOpenAI config:', { ...config, apiKey: '***', openAIApiKey: '***' });

    return new ChatOpenAI(config);
  }
}

export const openAIService = OpenAIService.getInstance();
