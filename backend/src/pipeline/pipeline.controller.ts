import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { GenerationService } from '../generation/generation.service';

@Controller('api/pipeline')
export class PipelineController {
  constructor(
    private readonly pipelineService: PipelineService,
    private readonly generationService: GenerationService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  async startPipeline(@Body('movieIdea') movieIdea: string) {
    if (!movieIdea?.trim()) {
      throw new BadRequestException('movieIdea is required');
    }
    return this.pipelineService.startPipeline(movieIdea.trim());
  }

  @Post(':id/approve-plan')
  @HttpCode(HttpStatus.OK)
  async approvePlan(
    @Param('id') sessionId: string,
    @Body('regenerate') regenerate?: boolean,
  ) {
    await this.pipelineService.approvePlan(sessionId, regenerate ?? false);
    return { ok: true };
  }

  @Post(':id/approve-scene')
  @HttpCode(HttpStatus.OK)
  async approveScene(
    @Param('id') sessionId: string,
    @Body('regenerate') regenerate?: boolean,
    @Body('skip') skip?: boolean,
  ) {
    await this.pipelineService.approveScene(sessionId, regenerate ?? false, skip ?? false);
    return { ok: true };
  }

  @Get(':id/state')
  async getState(@Param('id') sessionId: string) {
    return this.pipelineService.getState(sessionId);
  }

  @Post(':id/update-prompt')
  @HttpCode(HttpStatus.OK)
  async updatePrompt(
    @Param('id') sessionId: string,
    @Body('sceneIndex') sceneIndex: number,
    @Body('type') type: 'image' | 'video',
    @Body('index') index: number,
    @Body('prompt') prompt: string,
  ) {
    if (!prompt) throw new BadRequestException('prompt is required');
    await this.pipelineService.updatePrompt(sessionId, sceneIndex, type, index, prompt);
    return { ok: true };
  }

  @Post(':id/update-character-description')
  @HttpCode(HttpStatus.OK)
  async updateCharacterDescription(
    @Param('id') sessionId: string,
    @Body('characterName') characterName: string,
    @Body('description') description: string,
  ) {
    if (!characterName || !description) throw new BadRequestException('characterName and description are required');
    await this.pipelineService.updateCharacterDescription(sessionId, characterName, description);
    return { ok: true };
  }

  @Post(':id/update-scene-text')
  @HttpCode(HttpStatus.OK)
  async updateSceneText(
    @Param('id') sessionId: string,
    @Body('sceneIndex') sceneIndex: number,
    @Body('sceneText') sceneText: string,
  ) {
    if (sceneIndex < 0 || !sceneText) throw new BadRequestException('sceneIndex and sceneText are required');
    await this.pipelineService.updateSceneText(sessionId, sceneIndex, sceneText);
    return { ok: true };
  }

  @Post(':id/generate-image')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateImage(
    @Param('id') sessionId: string,
    @Body('sceneIndex') sceneIndex: number,
    @Body('imageIndex') imageIndex: number,
    @Body('prompt') prompt: string,
    @Body('referenceImages') referenceImages?: string[],
  ) {
    if (!prompt) throw new BadRequestException('prompt is required');
    await this.generationService.queueImageGeneration(sessionId, sceneIndex, imageIndex, prompt, referenceImages);
    return { ok: true, queued: true };
  }

  @Post(':id/upload-character-image')
  @HttpCode(HttpStatus.OK)
  async uploadCharacterImage(
    @Param('id') sessionId: string,
    @Body('characterName') characterName: string,
    @Body('imageData') imageData: string,
  ) {
    if (!characterName || !imageData) {
      throw new BadRequestException('characterName and imageData are required');
    }
    
    // Save character reference image to session folder
    const buffer = Buffer.from(imageData.split(',')[1], 'base64');
    const filename = `${characterName.toLowerCase().replace(/\s+/g, '_')}_reference.png`;
    const storyDir = `output/images/${sessionId}/characters`;
    
    // Create characters directory if it doesn't exist
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(process.env.OUTPUT_DIR || './output', 'images', sessionId, 'characters');
    fs.mkdirSync(fullPath, { recursive: true });
    
    const filepath = path.join(fullPath, filename);
    fs.writeFileSync(filepath, buffer);
    
    // Update pipeline state to track character reference image
    await this.pipelineService.uploadCharacterImage(sessionId, characterName, `${storyDir}/${filename}`);
    
    return { 
      ok: true, 
      url: `${storyDir}/${filename}`,
      characterName 
    };
  }

  @Post(':id/generate-video')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateVideo(
    @Param('id') sessionId: string,
    @Body('sceneIndex') sceneIndex: number,
    @Body('videoIndex') videoIndex: number,
    @Body('prompt') prompt: string,
    @Body('imagePath') imagePath?: string,
  ) {
    if (!prompt) throw new BadRequestException('prompt is required');
    await this.generationService.queueVideoGeneration(
      sessionId, sceneIndex, videoIndex, prompt, imagePath,
    );
    return { ok: true, queued: true };
  }

  @Get(':id/download-all')
  async downloadAll(@Param('id') sessionId: string, @Query('type') type: 'images' | 'videos') {
    const state = await this.pipelineService.getState(sessionId);
    const scenes = state?.scenes ?? [];
    const files: string[] = [];

    for (const scene of scenes) {
      if (type === 'images') {
        for (const img of scene.imageSequence) {
          if (img.generatedUrl) files.push(img.generatedUrl);
        }
      } else {
        for (const vid of scene.videoMotionPrompts) {
          if (vid.generatedUrl) files.push(vid.generatedUrl);
        }
      }
    }

    return { files };
  }
}
