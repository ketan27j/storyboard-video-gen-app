import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ImagenService } from './imagen.service';
import { VeoService } from './veo.service';
import { GrokService } from './grok.service';
import { ChatGptService } from './chatgpt.service';
import { StorageService } from '../storage/storage.service';
import { PipelineGateway } from '../pipeline/pipeline.gateway';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private readonly imageProvider = process.env.IMAGE_GEN_PROVIDER || 'manual';
  private readonly videoProvider = process.env.VIDEO_GEN_PROVIDER || 'manual';

  constructor(
    @InjectQueue('image-generation') private imageQueue: Queue,
    @InjectQueue('video-generation') private videoQueue: Queue,
    private readonly imagenService: ImagenService,
    private readonly veoService: VeoService,
    private readonly grokService: GrokService,
    private readonly chatGptService: ChatGptService,
    private readonly storageService: StorageService,
    private readonly gateway: PipelineGateway,
  ) {}

  async queueImageGeneration(
    sessionId: string,
    sceneIndex: number,
    imageIndex: number,
    prompt: string,
  ): Promise<void> {
    await this.imageQueue.add('generate-image', {
      sessionId, sceneIndex, imageIndex, prompt,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Queued image generation for session ${sessionId}, scene ${sceneIndex}, image ${imageIndex}, prompt ${prompt}`);
  }

  async queueVideoGeneration(
    sessionId: string,
    sceneIndex: number,
    videoIndex: number,
    prompt: string,
    imagePath?: string,
  ): Promise<void> {
    await this.videoQueue.add('generate-video', {
      sessionId, sceneIndex, videoIndex, prompt, imagePath,
    }, {
      attempts: 1,
      timeout: parseInt(process.env.VIDEO_GEN_TIMEOUT || '300000', 10),
    });

    this.logger.log(`Queued video generation for session ${sessionId}, scene ${sceneIndex}, video ${videoIndex}, prompt ${prompt}`);
  }

  async processImageJob(data: {
    sessionId: string;
    sceneIndex: number;
    imageIndex: number;
    prompt: string;
    referenceImages?: string[];
  }): Promise<void> {
    const { sessionId, sceneIndex, imageIndex, prompt, referenceImages } = data;

    try {
      this.gateway.emitImageProgress(sessionId, sceneIndex, imageIndex, 'generating');

      let buffer: Buffer;

      if (this.imageProvider === 'imagen') {
        const refInputs = referenceImages?.map((b64) => ({ base64: b64 })) ?? undefined;
        const result = await this.imagenService.generateImage(prompt, refInputs);
        buffer = result.imageBuffer;
      } else if (this.imageProvider === 'imagen3') {
        const result = await this.imagenService.generateImageImagen3(prompt);
        buffer = result.imageBuffer;
      } else if (this.imageProvider === 'leonardo') {
        buffer = await this.grokService.generateImage(prompt);
      } else if (this.imageProvider === 'chatgpt') {
        const result = await this.chatGptService.generateImage(prompt, referenceImages);
        // Read the generated image file
        buffer = require('fs').readFileSync(result.imagePath);
      } else {
        // Manual / mock mode — generate a placeholder image
        buffer = await this.generatePlaceholderImage(prompt);
      }

      const url = await this.storageService.saveImage(buffer, sceneIndex, imageIndex);
      this.gateway.emitImageProgress(sessionId, sceneIndex, imageIndex, 'done', url);
      this.logger.log(`Image done: ${url}`);
    } catch (err) {
      this.logger.error(`Image generation failed: ${err.message}`);
      this.gateway.emitImageProgress(sessionId, sceneIndex, imageIndex, 'error');
      throw err;
    }
  }

  async processVideoJob(data: {
    sessionId: string;
    sceneIndex: number;
    videoIndex: number;
    prompt: string;
    imagePath?: string;
  }): Promise<void> {
    const { sessionId, sceneIndex, videoIndex, prompt, imagePath } = data;

    try {
      this.gateway.emitVideoProgress(sessionId, sceneIndex, videoIndex, 'generating');

      let buffer: Buffer;

      if (this.videoProvider === 'veo') {
        buffer = await this.veoService.generateVideo(prompt, imagePath);
      } else if (this.videoProvider === 'grok') {
        buffer = await this.grokService.generateVideo(prompt, imagePath);
      } else {
        // Manual / mock mode
        buffer = Buffer.from('mock-video-data');
      }

      const url = await this.storageService.saveVideo(buffer, sceneIndex, videoIndex);
      this.gateway.emitVideoProgress(sessionId, sceneIndex, videoIndex, 'done', url);
      this.logger.log(`Video done: ${url}`);
    } catch (err) {
      this.logger.error(`Video generation failed: ${err.message}`, err.stack);
      this.gateway.emitVideoProgress(sessionId, sceneIndex, videoIndex, 'error');
      throw err;
    }
  }

  private async generatePlaceholderImage(prompt: string): Promise<Buffer> {
    // Generate a simple SVG placeholder as PNG buffer
    const svg = `<svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
      <rect width="1280" height="720" fill="#1c1917"/>
      <rect x="40" y="40" width="1200" height="640" fill="none" stroke="#44403c" stroke-width="2" rx="8"/>
      <text x="640" y="320" text-anchor="middle" font-family="monospace" font-size="24" fill="#78716c">
        [AI IMAGE PLACEHOLDER]
      </text>
      <text x="640" y="370" text-anchor="middle" font-family="monospace" font-size="14" fill="#57534e" width="1000">
        ${prompt.slice(0, 80)}${prompt.length > 80 ? '…' : ''}
      </text>
      <text x="640" y="420" text-anchor="middle" font-family="monospace" font-size="12" fill="#44403c">
        Set IMAGE_GEN_PROVIDER=imagen to use real generation
      </text>
    </svg>`;

    return Buffer.from(svg);
  }
}
