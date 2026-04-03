import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { GenerationService } from '../generation/generation.service';
import { StorageService } from '../storage/storage.service';
import { PipelineGateway } from '../pipeline/pipeline.gateway';
import { ImagenService } from '../generation/imagen.service';
import { GrokService } from '../generation/grok.service';
import { ChatGptService } from '../generation/chatgpt.service';

@Processor('image-generation')
export class ImageProcessor {
  private readonly logger = new Logger(ImageProcessor.name);

  constructor(
    private readonly generationService: GenerationService,
    private readonly storageService: StorageService,
    private readonly gateway: PipelineGateway,
    private readonly imagenService: ImagenService,
    private readonly grokService: GrokService,
    private readonly chatGptService: ChatGptService,
  ) {}

  @Process('generate-image')
  async handleImageGeneration(job: Job<{
    sessionId: string;
    sceneIndex: number;
    imageIndex: number;
    prompt: string;
    referenceImages?: string[];
  }>) {
    this.logger.log(`Processing image job ${job.id} for session ${job.data.sessionId}`);
    await this.generationService.processImageJob(job.data);
    this.logger.log(`Image job ${job.id} complete`);
  }

  @Process('generate-reference-image')
  async handleReferenceImageGeneration(job: Job<{
    sessionId: string;
    prompt: string;
  }>) {
    const { sessionId, prompt } = job.data;
    this.logger.log(`Processing reference image job ${job.id} for session ${sessionId}`);

    const imageProvider = process.env.IMAGE_GEN_PROVIDER || 'manual';

    try {
      this.gateway.emitReferenceImageProgress(sessionId, 'generating');

      let buffer: Buffer;

      if (imageProvider === 'imagen' || imageProvider === 'imagen3') {
        const result = await this.imagenService.generateImage(prompt);
        buffer = result.imageBuffer;
      } else if (imageProvider === 'leonardo') {
        buffer = await this.grokService.generateImage(prompt);
      } else if (imageProvider === 'chatgpt') {
        const result = await this.chatGptService.generateImage(prompt);
        buffer = require('fs').readFileSync(result.imagePath);
      } else {
        buffer = await this.generatePlaceholderReferenceImage(prompt);
      }

      const url = await this.storageService.saveReferenceImage(buffer, sessionId);
      this.gateway.emitReferenceImageProgress(sessionId, 'done', url);
      this.logger.log(`Reference image done: ${url}`);
    } catch (err) {
      this.logger.error(`Reference image generation failed: ${err.message}`);
      this.gateway.emitReferenceImageProgress(sessionId, 'error');
      throw err;
    }
  }

  @Process('generate-character-image')
  async handleCharacterImageGeneration(job: Job<{
    sessionId: string;
    characterName: string;
    prompt: string;
  }>) {
    const { sessionId, characterName, prompt } = job.data;
    this.logger.log(`Processing character image job ${job.id} for ${characterName} in session ${sessionId}`);

    const imageProvider = process.env.IMAGE_GEN_PROVIDER || 'manual';

    try {
      this.gateway.emitCharacterImageProgress(sessionId, characterName, 'generating');

      let buffer: Buffer;

      if (imageProvider === 'imagen' || imageProvider === 'imagen3') {
        const result = await this.imagenService.generateImage(prompt);
        buffer = result.imageBuffer;
      } else if (imageProvider === 'leonardo') {
        buffer = await this.grokService.generateImage(prompt);
      } else if (imageProvider === 'chatgpt') {
        const result = await this.chatGptService.generateImage(prompt);
        buffer = require('fs').readFileSync(result.imagePath);
      } else {
        buffer = await this.generatePlaceholderReferenceImage(prompt);
      }

      // Save to characters directory
      const filename = `${characterName.toLowerCase().replace(/\s+/g, '_')}_generated.png`;
      const charactersDir = `output/images/${sessionId}/characters`;
      
      // Create characters directory if it doesn't exist
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.join(process.env.OUTPUT_DIR || './output', 'images', sessionId, 'characters');
      fs.mkdirSync(fullPath, { recursive: true });
      
      const filepath = path.join(fullPath, filename);
      fs.writeFileSync(filepath, buffer);
      
      const url = `${charactersDir}/${filename}`;
      
      this.gateway.emitCharacterImageProgress(sessionId, characterName, 'done', url);
      this.logger.log(`Character image for ${characterName} done: ${url}`);
    } catch (err) {
      this.logger.error(`Character image generation failed for ${characterName}: ${err.message}`);
      this.gateway.emitCharacterImageProgress(sessionId, characterName, 'error');
      throw err;
    }
  }

  private async generatePlaceholderReferenceImage(prompt: string): Promise<Buffer> {
    const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#1c1917"/>
      <rect x="40" y="40" width="1200" height="640" fill="none" stroke="#f59e0b" stroke-width="2" rx="8"/>
      <text x="640" y="300" text-anchor="middle" font-family="monospace" font-size="20" fill="#f59e0b">
        [STYLE REFERENCE IMAGE]
      </text>
      <text x="640" y="360" text-anchor="middle" font-family="monospace" font-size="14" fill="#78716c" width="1000">
        ${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}
      </text>
      <text x="640" y="420" text-anchor="middle" font-family="monospace" font-size="12" fill="#44403c">
        Set IMAGE_GEN_PROVIDER=imagen to use real generation
      </text>
    </svg>`;

    return Buffer.from(svg);
  }
}
