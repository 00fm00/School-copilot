export interface ChatContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILlmProvider {
  generateAnswer(
    systemPrompt: string,
    history: ChatContextMessage[],
    userQueryWithContext: string,
  ): Promise<string>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
