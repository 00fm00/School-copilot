import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { DocumentChunk, DocumentChunkDocument } from '../schemas/document-chunk.schema';
import { EMBEDDING_PROVIDER, IEmbeddingProvider } from '../llm/embedding.interface';
import { buildChunkFilter, ChunkFilterUser } from './chunk-filter';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  page: number;
  chunkIndex: number;
  text: string;
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  shouldRefuse: boolean;
  questionEmbedding: number[];
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);
  private readonly minScore: number;
  private readonly topK: number;

  constructor(
    @InjectModel(DocumentChunk.name) private chunkModel: Model<DocumentChunkDocument>,
    @Inject(EMBEDDING_PROVIDER) private embeddingProvider: IEmbeddingProvider,
    private configService: ConfigService,
  ) {
    const hasApiKey = Boolean(this.configService.get<string>('OPENAI_API_KEY')?.trim());
    const defaultMinScore = hasApiKey ? 0.6 : 0.02;
    this.minScore = this.configService.get<number>('RETRIEVAL_MIN_SCORE', defaultMinScore);
    this.topK = this.configService.get<number>('RETRIEVAL_TOP_K', 6);
  }

  // Cosine similarity computation for fallback
  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      const valA = a[i] ?? 0;
      const valB = b[i] ?? 0;
      dot += valA * valB;
      normA += valA * valA;
      normB += valB * valB;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async retrieveRelevantChunks(user: ChunkFilterUser, question: string): Promise<RetrievalResult> {
    const questionEmbedding = await this.embeddingProvider.embedQuery(question);
    const filter = buildChunkFilter(user);

    let candidates: RetrievedChunk[] = [];

    // Try MongoDB Atlas $vectorSearch pipeline first
    try {
      const pipeline: any[] = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: questionEmbedding,
            numCandidates: 100,
            limit: this.topK,
            filter,
          },
        },
        {
          $project: {
            _id: 1,
            documentId: 1,
            documentTitle: 1,
            page: 1,
            chunkIndex: 1,
            text: 1,
            score: { $meta: 'vectorSearchScore' },
          },
        },
      ];

      const rawResults = await this.chunkModel.aggregate(pipeline).exec();
      candidates = rawResults.map((r: any) => ({
        chunkId: r._id.toString(),
        documentId: r.documentId.toString(),
        documentTitle: r.documentTitle,
        page: r.page,
        chunkIndex: r.chunkIndex,
        text: r.text,
        score: r.score,
      }));
    } catch (err: any) {
      // Fallback for standalone/local Mongo or in-memory tests where Atlas search is unavailable
      this.logger.debug(
        `Atlas $vectorSearch not available (${err.message}). Using resilient permission-filtered fallback.`,
      );
    }

    const hasOpenAiKey = Boolean(this.configService.get<string>('OPENAI_API_KEY')?.trim());
    const effectiveMinScore = hasOpenAiKey ? this.minScore : 0.5;

    // Fallback if Atlas returned 0 results (e.g. index still building or offline hash vectors)
    if (candidates.length === 0) {
      const matchingChunks = await this.chunkModel.find(filter).exec();

      candidates = matchingChunks
        .map((chunk) => {
          const score = this.cosineSimilarity(questionEmbedding, chunk.embedding);
          return {
            chunkId: chunk._id.toString(),
            documentId: chunk.documentId.toString(),
            documentTitle: chunk.documentTitle,
            page: chunk.page,
            chunkIndex: chunk.chunkIndex,
            text: chunk.text,
            score,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, this.topK);
    }

    // Step 2b: Hybrid Keyword Matching to complement vector search
    const stopWords = new Set([
      'what',
      'is',
      'the',
      'for',
      'a',
      'an',
      'in',
      'on',
      'at',
      'to',
      'of',
      'and',
      'are',
      'this',
      'that',
      'with',
      'from',
      'by',
      'can',
      'how',
      'do',
      'does',
      'as',
      'it',
      'or',
      'be',
      'tell',
      'show',
      'give',
      'me',
      'you',
      'where',
      'when',
      'who',
      'why',
      'about',
      'currently',
      'there',
      'here',
    ]);
    const rawWords = question.toLowerCase().match(/\b[a-zA-Z0-9_-]{3,}\b/g) || [];
    const keywords = rawWords.filter((w) => !stopWords.has(w));

    if (keywords.length > 0) {
      try {
        const regexPatterns = keywords.map((k) => new RegExp(`\\b${k}`, 'i'));
        const textMatches = await this.chunkModel
          .find({
            ...filter,
            $or: [{ text: { $in: regexPatterns } }, { documentTitle: { $in: regexPatterns } }],
          })
          .limit(this.topK)
          .exec();

        for (const match of textMatches) {
          const id = match._id.toString();
          const existing = candidates.find((c) => c.chunkId === id);
          if (existing) {
            // Boost score if keyword also matched
            existing.score = Math.max(existing.score, 0.85);
          } else {
            candidates.push({
              chunkId: id,
              documentId: match.documentId.toString(),
              documentTitle: match.documentTitle,
              page: match.page,
              chunkIndex: match.chunkIndex,
              text: match.text,
              score: 0.8,
            });
          }
        }
      } catch (err: any) {
        this.logger.debug(`Keyword search error: ${err.message}`);
      }
    }

    // Re-sort candidates by score
    candidates.sort((a, b) => b.score - a.score);

    // Step 3: Drop chunks below effective score threshold
    const filteredChunks = candidates.filter((c) => c.score >= effectiveMinScore);

    if (filteredChunks.length === 0) {
      this.logger.log(
        `No chunks scored >= ${effectiveMinScore}. Maximum candidate score was ${
          candidates[0]?.score.toFixed(3) || 'none'
        }. Triggering refusal.`,
      );
      return {
        chunks: [],
        shouldRefuse: true,
        questionEmbedding,
      };
    }

    this.logger.log(
      `Retrieved ${filteredChunks.length} chunks above threshold ${this.minScore} for user role ${user.role}`,
    );

    return {
      chunks: filteredChunks,
      shouldRefuse: false,
      questionEmbedding,
    };
  }
}
