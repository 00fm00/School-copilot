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
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    const openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    const baseUrl = this.configService.get<string>('OPENAI_BASE_URL');

    if (groqKey && groqKey.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: groqKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
      const configured = this.configService.get<string>('LLM_MODEL');
      this.model =
        configured && configured !== 'gpt-4o-mini' && configured !== 'llama-3.3-70b-versatile'
          ? configured
          : 'openai/gpt-oss-120b';
      this.logger.log(`LLM Provider configured with Groq using model: ${this.model}`);
    } else if (openAiKey && openAiKey.trim() !== '') {
      this.openai = new OpenAI({
        apiKey: openAiKey,
        baseURL: baseUrl && baseUrl.trim() !== '' ? baseUrl : undefined,
      });
      this.model = this.configService.get<string>('LLM_MODEL', 'gpt-4o-mini');
      this.logger.log(`LLM Provider configured with OpenAI using model: ${this.model}`);
    } else {
      this.model = 'gpt-4o-mini';
      this.logger.warn(
        'Neither OPENAI_API_KEY nor GROQ_API_KEY is set. LLM provider will use heuristic fallback for offline testing.',
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

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userQueryWithContext },
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.1,
      });

      return completion.choices[0]?.message?.content || 'I could not generate an answer.';
    } catch (err: any) {
      if (err?.status === 404) {
        this.logger.warn(
          `Model ${this.model} returned 404 on Groq. Attempting fallback model openai/gpt-oss-20b...`,
        );
        try {
          const fallback = await this.openai.chat.completions.create({
            model: 'openai/gpt-oss-20b',
            messages,
            temperature: 0.1,
          });
          return fallback.choices[0]?.message?.content || 'I could not generate an answer.';
        } catch (fallbackErr: any) {
          this.logger.error(`Fallback model error: ${fallbackErr.message}`);
        }
      }
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
