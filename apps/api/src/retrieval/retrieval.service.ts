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
    this.minScore = this.configService.get<number>('RETRIEVAL_MIN_SCORE', 0.6);
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

      // Apply permission filter strictly inside MongoDB query
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

    // Step 3: Drop chunks below RETRIEVAL_MIN_SCORE
    const filteredChunks = candidates.filter((c) => c.score >= this.minScore);

    if (filteredChunks.length === 0) {
      this.logger.log(
        `No chunks scored >= ${this.minScore}. Maximum candidate score was ${
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
