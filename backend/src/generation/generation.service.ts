import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { ImagenService, ReferenceImageInput } from './imagen.service';
import { VeoService } from './veo.service';
import { GrokService } from './grok.service';
import { ChatGptService } from './chatgpt.service';
import { StorageService } from '../storage/storage.service';
import { PipelineGateway } from '../pipeline/pipeline.gateway';
import { DatabaseService } from '../database/database.service';

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
    private readonly databaseService: DatabaseService,
  ) {}

  async queueImageGeneration(
    sessionId: string,
    sceneIndex: number,
    imageIndex: number,
    prompt: string,
    referenceImages?: string[],
  ): Promise<void> {
    await this.imageQueue.add('generate-image', {
      sessionId, sceneIndex, imageIndex, prompt, referenceImages,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Queued image generation for session ${sessionId}, scene ${sceneIndex}, image ${imageIndex}`);
  }

  async queueReferenceImageGeneration(
    sessionId: string,
    prompt: string,
  ): Promise<void> {
    await this.imageQueue.add('generate-reference-image', {
      sessionId, prompt,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Queued reference image generation for session ${sessionId}`);
  }

  async queueCharacterImageGeneration(
    sessionId: string,
    characterName: string,
    prompt: string,
  ): Promise<void> {
    await this.imageQueue.add('generate-character-image', {
      sessionId, characterName, prompt,
    }, {
      attempts: 2,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(`Queued character image generation for ${characterName} in session ${sessionId}`);
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

      if (this.imageProvider === 'nanobanana') {
        // Get character reference images for this scene (already base64)
        const characterRefs = await this.getCharacterReferenceImages(sessionId, sceneIndex);
        // Get custom uploaded scene image if exists (already base64)
        const customSceneImage = await this.getCustomSceneImage(sessionId, sceneIndex, imageIndex);
        
        // Convert URL-based reference images from frontend to base64
        const convertedRefImages = await this.convertReferenceImagesToBase64(referenceImages || []);
        
        // Combine all reference images: frontend URLs (converted) + character refs
        const allReferenceImages = [...convertedRefImages, ...characterRefs];
        
        // If custom scene image exists, add it as primary reference
        if (customSceneImage) {
          allReferenceImages.unshift(customSceneImage);
        }
        
        // Limit to max 3 reference images (Gemini 2.5 Flash Image limit)
        const limitedRefImages = allReferenceImages.slice(0, 3);
        
        const refInputs = limitedRefImages.map((b64) => ({ base64: b64 }));
        const result = await this.imagenService.generateImage(prompt, refInputs);
        buffer = result.imageBuffer;
      } else {
        // Manual / mock mode — generate a placeholder image
        buffer = await this.generatePlaceholderImage(prompt);
      }

      const url = await this.storageService.saveImage(buffer, sessionId, sceneIndex, imageIndex);
      
      // Update session in database with completed image
      await this.databaseService.updateSession(sessionId, (session) => {
        const scenes = [...(session.scenes || [])];
        if (scenes[sceneIndex] && scenes[sceneIndex].imageSequence && scenes[sceneIndex].imageSequence[imageIndex]) {
          scenes[sceneIndex].imageSequence[imageIndex] = {
            ...scenes[sceneIndex].imageSequence[imageIndex],
            status: 'done',
            url: url,
            generatedUrl: url
          };
        }
        return { scenes };
      });
      
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

      const url = await this.storageService.saveVideo(buffer, sessionId, sceneIndex, videoIndex);
      
      // Update session in database with completed video
      await this.databaseService.updateSession(sessionId, (session) => {
        const scenes = [...(session.scenes || [])];
        if (scenes[sceneIndex] && scenes[sceneIndex].videoMotionPrompts && scenes[sceneIndex].videoMotionPrompts[videoIndex]) {
          scenes[sceneIndex].videoMotionPrompts[videoIndex] = {
            ...scenes[sceneIndex].videoMotionPrompts[videoIndex],
            status: 'done',
            url: url,
            generatedUrl: url
          };
        }
        return { scenes };
      });
      
      this.gateway.emitVideoProgress(sessionId, sceneIndex, videoIndex, 'done', url);
      this.logger.log(`Video done: ${url}`);
    } catch (err) {
      this.logger.error(`Video generation failed: ${err.message}`, err.stack);
      this.gateway.emitVideoProgress(sessionId, sceneIndex, videoIndex, 'error');
      throw err;
    }
  }

  private async getCharacterReferenceImages(sessionId: string, sceneIndex: number): Promise<string[]> {
    try {
      const characterRefs: string[] = [];
      const outputDir = this.storageService.getOutputDir();
      const charactersDir = `${outputDir}/images/${sessionId}/characters`;
      
      // Scan the characters directory directly to find all uploaded character reference images
      if (require('fs').existsSync(charactersDir)) {
        const files = require('fs').readdirSync(charactersDir);
        
        // Filter for character reference images (files ending with _reference.png)
        const characterImageFiles = files.filter(file => file.endsWith('_reference.png'));
        
        for (const imageFile of characterImageFiles) {
          const characterImagePath = `${charactersDir}/${imageFile}`;
          
          try {
            // Convert image to base64 for reference
            const imageBuffer = require('fs').readFileSync(characterImagePath);
            const base64Image = imageBuffer.toString('base64');
            characterRefs.push(base64Image);
            
            const characterName = imageFile.replace('_reference.png', '');
            this.logger.log(`Found character reference image for ${characterName}`);
          } catch (readError) {
            this.logger.warn(`Failed to read character image ${imageFile}: ${readError.message}`);
          }
        }
      }
      
      return characterRefs;
    } catch (error) {
      this.logger.error(`Failed to get character reference images: ${error.message}`);
      return [];
    }
  }

  private async getCustomSceneImage(sessionId: string, sceneIndex: number, imageIndex: number): Promise<string | null> {
    try {
      const outputDir = this.storageService.getOutputDir();
      const scenesDir = `${outputDir}/images/${sessionId}/scenes`;
      
      // Look for custom uploaded scene image
      const filename = `scene_${sceneIndex + 1}_image_${imageIndex + 1}_custom.png`;
      const imagePath = `${scenesDir}/${filename}`;
      
      if (require('fs').existsSync(imagePath)) {
        const imageBuffer = require('fs').readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        this.logger.log(`Found custom scene image for scene ${sceneIndex + 1}, image ${imageIndex + 1}`);
        return base64Image;
      }
      
      return null;
    } catch (error) {
      this.logger.warn(`Failed to get custom scene image: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert reference image URLs to base64 strings.
   * Handles both HTTP URLs (fetches the image) and already-base64 strings (passes through).
   */
  private async convertReferenceImagesToBase64(referenceImages: string[]): Promise<string[]> {
    const converted: string[] = [];
    
    for (const refImage of referenceImages) {
      if (!refImage) continue;
      
      // Check if it's already a base64 string (no http:// or https:// prefix)
      if (!refImage.startsWith('http://') && !refImage.startsWith('https://')) {
        // Already base64, pass through
        converted.push(refImage);
        continue;
      }
      
      // It's a URL, fetch and convert to base64
      try {
        this.logger.log(`Fetching reference image from URL: ${refImage}`);
        
        // Use fetch to get the image
        const response = await fetch(refImage);
        
        if (!response.ok) {
          this.logger.warn(`Failed to fetch reference image from ${refImage}: ${response.status} ${response.statusText}`);
          continue;
        }
        
        // Get the image as an ArrayBuffer and convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        
        converted.push(base64Image);
        this.logger.log(`Successfully converted URL to base64 for reference image`);
      } catch (error) {
        this.logger.warn(`Error fetching reference image ${refImage}: ${error.message}`);
      }
    }
    
    return converted;
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
