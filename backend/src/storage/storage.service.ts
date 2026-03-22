import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly outputDir: string;

  constructor() {
    this.outputDir = process.env.OUTPUT_DIR || path.resolve(__dirname, '../../../output');
    this.ensureDirectories();
  }

  private ensureDirectories() {
    const imagesDir = path.join(this.outputDir, 'images');
    const videosDir = path.join(this.outputDir, 'videos');
    fs.mkdirSync(imagesDir, { recursive: true });
    fs.mkdirSync(videosDir, { recursive: true });
    this.logger.log(`Output directories ready at ${this.outputDir}`);
  }

  async saveImage(buffer: Buffer, sessionId: string, sceneIndex: number, imageIndex: number): Promise<string> {
    const storyDir = path.join(this.outputDir, 'images', sessionId);
    fs.mkdirSync(storyDir, { recursive: true });
    
    const filename = `scene_${String(sceneIndex + 1).padStart(2, '0')}_image_${String(imageIndex + 1).padStart(2, '0')}.png`;
    const filepath = path.join(storyDir, filename);
    fs.writeFileSync(filepath, buffer);
    this.logger.log(`Saved image: ${filename} in story ${sessionId}`);
    return `output/images/${sessionId}/${filename}`;
  }

  async saveVideo(buffer: Buffer, sessionId: string, sceneIndex: number, videoIndex: number): Promise<string> {
    const storyDir = path.join(this.outputDir, 'videos', sessionId);
    fs.mkdirSync(storyDir, { recursive: true });
    
    const filename = `scene_${String(sceneIndex + 1).padStart(2, '0')}_video_${String(videoIndex + 1).padStart(2, '0')}.mp4`;
    const filepath = path.join(storyDir, filename);
    fs.writeFileSync(filepath, buffer);
    this.logger.log(`Saved video: ${filename} in story ${sessionId}`);
    return `output/videos/${sessionId}/${filename}`;
  }

  getOutputDir() {
    return this.outputDir;
  }
}
