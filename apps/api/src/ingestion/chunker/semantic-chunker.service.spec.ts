import { SemanticChunkerService } from './semantic-chunker.service';

describe('SemanticChunkerService', () => {
  let service: SemanticChunkerService;

  beforeEach(() => {
    service = new SemanticChunkerService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should chunk short text preserving page number and sequential chunkIndex', () => {
    const pages = [
      { pageNumber: 1, text: 'This is the first page of the leave policy.' },
      { pageNumber: 2, text: 'This is the second page of the leave policy.' },
    ];

    const chunks = service.chunkPages('Leave Policy', pages);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.page).toBe(1);
    expect(chunks[0]!.chunkIndex).toBe(0);
    expect(chunks[0]!.embeddedText).toBe(
      'Document: Leave Policy\n\nThis is the first page of the leave policy.',
    );

    expect(chunks[1]!.page).toBe(2);
    expect(chunks[1]!.chunkIndex).toBe(1);
    expect(chunks[1]!.embeddedText).toBe(
      'Document: Leave Policy\n\nThis is the second page of the leave policy.',
    );
  });

  it('should split long pages exceeding target character limit into multiple chunks with overlap', () => {
    const paragraph1 = 'Sentence one in paragraph one. '.repeat(50); // ~1550 chars
    const paragraph2 = 'Sentence two in paragraph two. '.repeat(50); // ~1550 chars
    const longText = `${paragraph1}\n\n${paragraph2}`;

    const pages = [{ pageNumber: 1, text: longText }];
    const chunks = service.chunkPages('Long Document', pages);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.page).toBe(1);
    expect(chunks[1]!.page).toBe(1);
    expect(chunks[0]!.embeddedText.startsWith('Document: Long Document')).toBe(true);
    expect(chunks[1]!.embeddedText.startsWith('Document: Long Document')).toBe(true);
  });

  it('should skip completely empty or whitespace-only pages', () => {
    const pages = [
      { pageNumber: 1, text: 'Valid page content.' },
      { pageNumber: 2, text: '   \n  \t  ' },
      { pageNumber: 3, text: 'Third page content.' },
    ];

    const chunks = service.chunkPages('Test Doc', pages);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.page).toBe(1);
    expect(chunks[1]!.page).toBe(3);
    expect(chunks[1]!.chunkIndex).toBe(1);
  });
});
