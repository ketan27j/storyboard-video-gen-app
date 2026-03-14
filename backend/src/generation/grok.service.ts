import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class GrokService {
  private readonly logger = new Logger(GrokService.name);

  async generateImage(prompt: string): Promise<Buffer> {
    this.logger.log('Generating image via Leonardo.ai (Playwright fallback)');

    const { chromium } = await import('playwright');
    const authStatePath = path.resolve(process.env.LEONARDO_AUTH_STATE || './auth/leonardo_state.json');

    const browser = await chromium.launch({
      headless: process.env.HEADLESS_BROWSER !== 'false',
    });

    const context = fs.existsSync(authStatePath)
      ? await browser.newContext({ storageState: authStatePath })
      : await browser.newContext();

    const page = await context.newPage();

    try {
      await page.goto('https://app.leonardo.ai/ai-generations', { waitUntil: 'networkidle' });

      // Fill prompt
      await page.fill('[data-testid="prompt-input"], textarea[placeholder*="prompt"]', prompt);

      // Click generate
      await page.click('[data-testid="generate-button"], button:has-text("Generate")');

      // Wait for image
      const timeout = parseInt(process.env.IMAGE_GEN_TIMEOUT || '120000', 10);
      const imgElement = await page.waitForSelector(
        '.generated-image img, [data-testid="generated-image"]',
        { timeout },
      );

      // Get image src and download
      const src = await imgElement.getAttribute('src');
      if (!src) throw new Error('No image src found');

      const imgResponse = await page.request.get(src);
      return Buffer.from(await imgResponse.body());
    } finally {
      await browser.close();
    }
  }

  async generateVideo(prompt: string, imagePath?: string): Promise<Buffer> {
    this.logger.log('Generating video via Grok (Playwright fallback)');

    const { chromium } = await import('playwright');
    const authStatePath = path.resolve(process.env.GROK_AUTH_STATE || './auth/grok_state.json');

    const browser = await chromium.launch({
      headless: process.env.HEADLESS_BROWSER !== 'false',
    });

    const context = fs.existsSync(authStatePath)
      ? await browser.newContext({ storageState: authStatePath })
      : await browser.newContext();

    const page = await context.newPage();

    try {
      await page.goto('https://x.ai/grok', { waitUntil: 'networkidle' });

      // Upload reference image if available
      if (imagePath) {
        const fullPath = path.resolve(imagePath);
        if (fs.existsSync(fullPath)) {
          const fileInput = await page.$('input[type="file"]');
          if (fileInput) await fileInput.setInputFiles(fullPath);
        }
      }

      // Fill prompt and generate
      await page.fill('textarea, [data-testid="prompt"]', `Generate a video: ${prompt}`);
      await page.keyboard.press('Enter');

      // Wait for video
      const timeout = parseInt(process.env.VIDEO_GEN_TIMEOUT || '300000', 10);
      const videoElement = await page.waitForSelector('video', { timeout });
      const videoSrc = await videoElement.getAttribute('src');
      if (!videoSrc) throw new Error('No video src found');

      const videoResponse = await page.request.get(videoSrc);
      return Buffer.from(await videoResponse.body());
    } finally {
      await browser.close();
    }
  }
}
