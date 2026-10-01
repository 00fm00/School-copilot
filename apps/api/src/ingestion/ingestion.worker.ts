import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IngestionService, IngestionJobData } from './ingestion.processor';

@Processor('document-ingestion')
export class IngestionWorker extends WorkerHost {
  private readonly logger = new Logger(IngestionWorker.name);

  constructor(private ingestionService: IngestionService) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<void> {
    this.logger.log(`Processing queue job ${job.id} for document ${job.data.documentId}`);
    await this.ingestionService.processDocument(job.data);
  }
}
