export interface IEmbeddingProvider {
  embedQuery(text: string): Promise<number[]>;
  embedChunks(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_PROVIDER = 'EMBEDDING_PROVIDER';
