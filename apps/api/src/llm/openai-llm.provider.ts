import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ILlmProvider, ChatContextMessage } from './llm.interface';

@Injectable()
export class OpenAiLlmProvider implements ILlmProvider {
  private readonly logger = new Logger(OpenAiLlmProvider.name);
  private openai: OpenAI | null = null;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');

    if (apiKey && apiKey.trim() !== '') {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY is not set. LLM provider will use heuristic fallback for offline testing.',
      );
    }
  }

  async generateAnswer(
    systemPrompt: string,
    history: ChatContextMessage[],
    userQueryWithContext: string,
  ): Promise<string> {
    if (!this.openai) {
      return this.generateFallbackAnswer(userQueryWithContext);
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({
          role: m.role as 'system' | 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userQueryWithContext },
      ];

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.1,
      });

      return completion.choices[0]?.message?.content || 'I could not generate an answer.';
    } catch (err: any) {
      this.logger.error(`OpenAI LLM completion error: ${err.message}`, err.stack);
      throw err;
    }
  }

  private generateFallbackAnswer(userQueryWithContext: string): string {
    // When offline without key, extract first context snippet and generate synthetic cited answer
    const match = userQueryWithContext.match(/<context id="(\d+)"[^>]*>([\s\S]*?)<\/context>/i);
    if (match && match[1] && match[2]) {
      const id = match[1];
      const text = match[2].trim().slice(0, 150);
      return `According to the documents: ${text} [${id}]`;
    }
    return 'I could not find this in the documents available to you.';
  }
}
