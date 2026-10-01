import { Module } from '@nestjs/common';
import { OpenAiLlmProvider } from './openai-llm.provider';
import { LLM_PROVIDER } from './llm.interface';

@Module({
  providers: [
    OpenAiLlmProvider,
    {
      provide: LLM_PROVIDER,
      useClass: OpenAiLlmProvider,
    },
  ],
  exports: [LLM_PROVIDER, OpenAiLlmProvider],
})
export class LlmModule {}
