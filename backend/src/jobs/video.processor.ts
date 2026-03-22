import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { GenerationService } from '../generation/generation.service';

@Processor('video-generation')
export class VideoProcessor {
  private readonly logger = new Logger(VideoProcessor.name);

  constructor(private readonly generationService: GenerationService) {}

  @Process('generate-video')
  async handleVideoGeneration(job: Job<{
    sessionId: string;
    sceneIndex: number;
    videoIndex: number;
    prompt: string;
    imagePath?: string;
  }>) {
    this.logger.log(`Processing video job ${job.id} for session ${job.data.sessionId}`);
    this.logger.log(`Job data: sessionId=${job.data.sessionId}, sceneIndex=${job.data.sceneIndex}, videoIndex=${job.data.videoIndex}, prompt="${job.data.prompt}", imagePath="${job.data.imagePath}"`);
    await this.generationService.processVideoJob(job.data);
    this.logger.log(`Video job ${job.id} complete`);
  }
}