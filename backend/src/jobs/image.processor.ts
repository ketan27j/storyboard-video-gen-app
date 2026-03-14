import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { GenerationService } from '../generation/generation.service';

@Processor('image-generation')
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(private readonly generationService: GenerationService) {}

  @Process('generate-image')
  async handleImageGeneration(job: Job<{
    sessionId: string;
    sceneIndex: number;
    imageIndex: number;
    prompt: string;
  }>) {
    this.logger.log(`Processing image job ${job.id} for session ${job.data.sessionId}`);
    await this.generationService.processImageJob(job.data);
    this.logger.log(`Image job ${job.id} complete`);
  }
}
