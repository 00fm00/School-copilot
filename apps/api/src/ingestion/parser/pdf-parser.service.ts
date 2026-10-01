import { Injectable, Logger } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';

export interface ExtractedPage {
  pageNumber: number; // 1-indexed
  text: string;
}

export interface PdfParseResult {
  pages: ExtractedPage[];
  pageCount: number;
  totalCharacters: number;
}

@Injectable()
export class PdfParserService {
  private readonly logger = new Logger(PdfParserService.name);

  async parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { totalPages, text: pageTexts } = await extractText(pdf, { mergePages: false });

      const pages: ExtractedPage[] = [];
      let totalCharacters = 0;

      if (Array.isArray(pageTexts)) {
        pageTexts.forEach((pageText, index) => {
          const cleanedText = (pageText || '').trim();
          totalCharacters += cleanedText.length;
          pages.push({
            pageNumber: index + 1,
            text: cleanedText,
          });
        });
      } else if (typeof pageTexts === 'string') {
        const cleanedText = (pageTexts as string).trim();
        totalCharacters = cleanedText.length;
        pages.push({
          pageNumber: 1,
          text: cleanedText,
        });
      }

      this.logger.log(
        `Parsed PDF with ${totalPages} page(s) and ${totalCharacters} total characters`,
      );
      return {
        pages,
        pageCount: totalPages,
        totalCharacters,
      };
    } catch (err: any) {
      this.logger.error(`Error parsing PDF buffer with unpdf: ${err.message}`, err.stack);
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }
}
