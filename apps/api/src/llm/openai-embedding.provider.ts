import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { IEmbeddingProvider } from './embedding.interface';

@Injectable()
export class OpenAiEmbeddingProvider implements IEmbeddingProvider {
  private readonly logger = new Logger(OpenAiEmbeddingProvider.name);
  private openai: OpenAI | null = null;
  private readonly model: string;
  private readonly dimensions: number;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.model = this.configService.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small');
    this.dimensions = this.configService.get<number>('EMBEDDING_DIMENSIONS', 1536);

    if (apiKey && apiKey.trim() !== '') {
      this.openai = new OpenAI({ apiKey });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY is not set. Embedding provider will use deterministic fallback for local testing.',
      );
    }
  }

  // Deterministic normalized embedding fallback for testing when no OpenAI key is set
  private generateFallbackEmbedding(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < this.dimensions; i++) {
      vector[i] = Math.sin(hash + i);
    }
    // Normalize vector
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
    return vector.map((val) => val / norm);
  }

  async embedQuery(text: string): Promise<number[]> {
    if (!this.openai) {
      return this.generateFallbackEmbedding(text);
    }

    return this.retryWithBackoff(async () => {
      const response = await this.openai!.embeddings.create({
        model: this.model,
        input: text,
        dimensions: this.dimensions,
      });
      return response.data[0]!.embedding;
    });
  }

  async embedChunks(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    if (!this.openai) {
      return texts.map((t) => this.generateFallbackEmbedding(t));
    }

    const batchSize = 64;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.retryWithBackoff(async () => {
        const response = await this.openai!.embeddings.create({
          model: this.model,
          input: batch,
          dimensions: this.dimensions,
        });
        return response.data.map((item) => item.embedding);
      });
      allEmbeddings.push(...batchEmbeddings);
    }

    return allEmbeddings;
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 500,
  ): Promise<T> {
    let delay = initialDelayMs;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        const isRateLimitOr5xx =
          err?.status === 429 || (err?.status && err.status >= 500 && err.status < 600);
        if (attempt === maxRetries || !isRateLimitOr5xx) {
          this.logger.error(`Embedding call failed after ${attempt} attempts: ${err.message}`);
          throw err;
        }
        this.logger.warn(
          `Embedding call error (${err.message}). Retrying attempt ${attempt + 1}/${maxRetries} in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('Retry exhausted');
  }
}
