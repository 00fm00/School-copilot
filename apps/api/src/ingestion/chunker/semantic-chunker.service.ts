import { Injectable } from '@nestjs/common';
import { ExtractedPage } from '../parser/pdf-parser.service';

export interface ChunkItem {
  page: number;
  chunkIndex: number;
  text: string;
  embeddedText: string;
}

@Injectable()
export class SemanticChunkerService {
  // Target: ~600 tokens (~2400 chars), with ~100 tokens overlap (~400 chars)
  private readonly targetChunkChars = 2400;
  private readonly overlapChars = 400;

  chunkPages(documentTitle: string, pages: ExtractedPage[]): ChunkItem[] {
    const chunks: ChunkItem[] = [];
    let globalChunkIndex = 0;

    for (const page of pages) {
      if (!page.text || page.text.trim().length === 0) {
        continue;
      }

      const pageChunks = this.chunkPageText(page.text);

      for (const text of pageChunks) {
        chunks.push({
          page: page.pageNumber,
          chunkIndex: globalChunkIndex++,
          text,
          embeddedText: `Document: ${documentTitle}\n\n${text}`,
        });
      }
    }

    return chunks;
  }

  private chunkPageText(text: string): string[] {
    const trimmed = text.trim();
    if (trimmed.length <= this.targetChunkChars) {
      return [trimmed];
    }

    // Split on paragraph boundaries first
    const paragraphs = trimmed.split(/\n\s*\n/);
    const resultChunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      // If a single paragraph is larger than target size, split on sentences
      if (cleanPara.length > this.targetChunkChars) {
        if (currentChunk.length > 0) {
          resultChunks.push(currentChunk.trim());
          currentChunk = this.getOverlapText(currentChunk);
        }

        const sentenceChunks = this.splitIntoSentences(cleanPara);
        for (const sentence of sentenceChunks) {
          if (currentChunk.length + sentence.length + 1 > this.targetChunkChars) {
            if (currentChunk.length > 0) {
              resultChunks.push(currentChunk.trim());
              currentChunk = this.getOverlapText(currentChunk);
            }
          }
          currentChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
        }
        continue;
      }

      // Normal paragraph accumulation
      if (currentChunk.length + cleanPara.length + 2 > this.targetChunkChars) {
        resultChunks.push(currentChunk.trim());
        currentChunk = `${this.getOverlapText(currentChunk)}\n\n${cleanPara}`;
      } else {
        currentChunk = currentChunk ? `${currentChunk}\n\n${cleanPara}` : cleanPara;
      }
    }

    if (currentChunk.trim().length > 0) {
      resultChunks.push(currentChunk.trim());
    }

    return resultChunks;
  }

  private splitIntoSentences(text: string): string[] {
    // Regex matching sentence terminators followed by whitespace or end of string
    const rawSentences = text.split(/(?<=[.!?])\s+/);
    const sentences: string[] = [];

    for (const s of rawSentences) {
      const trimmed = s.trim();
      if (!trimmed) continue;

      // If an individual sentence is absurdly long, slice by words
      if (trimmed.length > this.targetChunkChars) {
        const words = trimmed.split(/\s+/);
        let part = '';
        for (const word of words) {
          if (part.length + word.length + 1 > this.targetChunkChars) {
            if (part) sentences.push(part.trim());
            part = word;
          } else {
            part = part ? `${part} ${word}` : word;
          }
        }
        if (part) sentences.push(part.trim());
      } else {
        sentences.push(trimmed);
      }
    }

    return sentences;
  }

  private getOverlapText(chunk: string): string {
    if (chunk.length <= this.overlapChars) {
      return chunk;
    }
    // Extract last `overlapChars` characters, trying to start at a word boundary
    const slice = chunk.slice(-this.overlapChars);
    const firstSpace = slice.indexOf(' ');
    if (firstSpace !== -1 && firstSpace < 50) {
      return slice.slice(firstSpace + 1).trim();
    }
    return slice.trim();
  }
}
