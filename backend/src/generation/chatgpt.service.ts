import { Injectable, Logger } from '@nestjs/common';
import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface ChatGptImageResult {
  /** Path to the downloaded image file */
  imagePath: string;
  /** Original prompt used for generation */
  prompt: string;
  /** Timestamp of when the image was generated */
  timestamp: Date;
}

@Injectable()
export class ChatGptService {
  private readonly logger = new Logger(ChatGptService.name);
  private browser: Browser | null = null;
  private page: Page | null = null;
  private readonly downloadDir: string;
  private readonly chatGptUrl = 'https://chat.openai.com';
  private readonly imagesTabSelector = 'a:has-text("Images")';
  private readonly uploadButtonSelector = 'input[type="file"][accept*="image/"]';
  private readonly promptInputSelector = 'textarea[placeholder*="Describe"], textarea[placeholder*="Prompt"], textarea[placeholder*="Enter"], textarea[placeholder*="Type"]';
  private readonly generateButtonSelector = 'button:has-text("Generate")';
  private readonly imageGridSelector = '[data-testid="image-grid"]';
  private readonly downloadButtonSelector = 'button[aria-label*="Download"]';

  constructor() {
    // Create download directory if it doesn't exist
    this.downloadDir = path.join(process.cwd(), 'output', 'images', 'chatgpt');
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  /**
   * Initialize browser and navigate to ChatGPT
   */
  private async initializeBrowser(): Promise<void> {
    if (this.browser && this.page) {
      return;
    }

    this.logger.log('Initializing Playwright browser for ChatGPT automation');
    
    this.browser = await chromium.launch({
      headless: process.env.NODE_ENV === 'production',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    // Create context
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      javaScriptEnabled: true
    });

    this.page = await context.newPage();
    
    // Note: Download path will be handled by the page's default download behavior
    // The download directory is set in the constructor and will be used for file copying

    // Navigate to ChatGPT
    await this.page.goto(this.chatGptUrl, { waitUntil: 'networkidle' });
    
    // Wait for page to load
    await this.page.waitForSelector('body', { timeout: 30000 });
    
    this.logger.log('Browser initialized and navigated to ChatGPT');
  }

  /**
   * Check if user is logged in to ChatGPT
   */
  private async isLoggedIn(): Promise<boolean> {
    try {
      await this.page?.waitForSelector('nav', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Login to ChatGPT (manual process - user needs to login manually)
   */
  private async ensureLoggedIn(): Promise<void> {
    if (await this.isLoggedIn()) {
      return;
    }

    this.logger.warn('User not logged in to ChatGPT. Please login manually in the browser window.');
    
    // Wait for user to login manually
    await this.page?.waitForSelector('nav', { timeout: 120000 });
    
    this.logger.log('User has logged in to ChatGPT');
  }

  /**
   * Navigate to the Images tab in ChatGPT
   */
  private async navigateToImagesTab(): Promise<void> {
    try {
      // Look for images tab button
      const imagesTab = await this.page?.locator(this.imagesTabSelector);
      if (imagesTab && await imagesTab.isVisible()) {
        await imagesTab.click();
        await this.page?.waitForTimeout(2000); // Wait for tab to load
        this.logger.log('Navigated to Images tab');
      } else {
        // Try alternative selectors for images tab
        const alternativeSelectors = [
          'button:has-text("Images")',
          'button[data-testid*="image"]',
          'a[href*="images"]',
          'button:has-text("DALL·E")'
        ];

        for (const selector of alternativeSelectors) {
          try {
            const element = await this.page?.locator(selector);
            if (element && await element.isVisible()) {
              await element.click();
              await this.page?.waitForTimeout(2000);
              this.logger.log(`Navigated to Images using selector: ${selector}`);
              return;
            }
          } catch (error) {
            this.logger.debug(`Alternative selector ${selector} not found: ${error.message}`);
          }
        }

        throw new Error('Could not find Images tab in ChatGPT interface');
      }
    } catch (error) {
      throw new Error(`Failed to navigate to Images tab: ${error.message}`);
    }
  }

  /**
   * Upload reference images to ChatGPT
   */
  private async uploadReferenceImages(referenceImages: string[]): Promise<void> {
    if (!referenceImages || referenceImages.length === 0) {
      this.logger.log('No reference images to upload');
      return;
    }

    try {
      // Find upload button
      const uploadInput = await this.page?.locator(this.uploadButtonSelector);
      if (!uploadInput || !(await uploadInput.isVisible())) {
        this.logger.warn('Upload button not found, skipping reference image upload');
        return;
      }

      for (let i = 0; i < referenceImages.length; i++) {
        const imagePath = referenceImages[i];
        
        if (!fs.existsSync(imagePath)) {
          this.logger.warn(`Reference image not found: ${imagePath}`);
          continue;
        }

        await uploadInput.setInputFiles(imagePath);
        await this.page?.waitForTimeout(1000); // Wait for upload to process
        
        this.logger.log(`Uploaded reference image ${i + 1}/${referenceImages.length}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to upload reference images: ${error.message}`);
    }
  }

  /**
   * Submit prompt and generate image
   */
  private async submitPromptAndGenerate(prompt: string): Promise<void> {
    try {
      // Find prompt input
      const promptInput = await this.page?.locator(this.promptInputSelector);
      if (!promptInput || !(await promptInput.isVisible())) {
        throw new Error('Prompt input field not found');
      }

      // Clear and enter prompt
      await promptInput.fill('');
      await promptInput.type(prompt, { delay: 50 });
      
      this.logger.log('Prompt entered, waiting for generation...');
      
      // Find and click generate button
      const generateButton = await this.page?.locator(this.generateButtonSelector);
      if (generateButton && await generateButton.isVisible()) {
        await generateButton.click();
      } else {
        // Try alternative selectors for generate button
        const alternativeSelectors = [
          'button:has-text("Create")',
          'button:has-text("Generate Image")',
          'button[type="submit"]',
          'button[data-testid*="generate"]'
        ];

        let buttonClicked = false;
        for (const selector of alternativeSelectors) {
          try {
            const element = await this.page?.locator(selector);
            if (element && await element.isVisible()) {
              await element.click();
              buttonClicked = true;
              break;
            }
          } catch (error) {
            this.logger.debug(`Alternative generate button selector ${selector} not found: ${error.message}`);
          }
        }

        if (!buttonClicked) {
          throw new Error('Generate button not found');
        }
      }

      // Wait for generation to complete
      await this.page?.waitForTimeout(10000); // Initial wait for generation
      
      // Wait for image to appear in grid
      try {
        await this.page?.waitForSelector(this.imageGridSelector, { timeout: 30000 });
      } catch {
        this.logger.warn('Image grid not found, but continuing...');
      }

    } catch (error) {
      throw new Error(`Failed to submit prompt and generate image: ${error.message}`);
    }
  }

  /**
   * Download the generated image
   */
  private async downloadGeneratedImage(): Promise<string> {
    try {
      // Wait for download to complete
      const downloadPromise = this.page?.waitForEvent('download');
      
      // Look for download button
      const downloadButton = await this.page?.locator(this.downloadButtonSelector);
      if (downloadButton && await downloadButton.isVisible()) {
        await downloadButton.click();
      } else {
        // Try alternative selectors for download button
        const alternativeSelectors = [
          'button:has-text("Download")',
          'button[aria-label*="download"]',
          'a[href*="download"]',
          'button[data-testid*="download"]'
        ];

        let downloadClicked = false;
        for (const selector of alternativeSelectors) {
          try {
            const element = await this.page?.locator(selector);
            if (element && await element.isVisible()) {
              await element.click();
              downloadClicked = true;
              break;
            }
          } catch (error) {
            this.logger.debug(`Alternative download button selector ${selector} not found: ${error.message}`);
          }
        }

        if (!downloadClicked) {
          throw new Error('Download button not found');
        }
      }

      // Wait for download to complete
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      if (!downloadPath) {
        throw new Error('Download path not available');
      }

      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `chatgpt-image-${timestamp}.png`;
      const finalPath = path.join(this.downloadDir, fileName);
      
      // Copy downloaded file to final location
      fs.copyFileSync(downloadPath, finalPath);
      
      this.logger.log(`Image downloaded to: ${finalPath}`);
      return finalPath;

    } catch (error) {
      throw new Error(`Failed to download generated image: ${error.message}`);
    }
  }

  /**
   * Generate image using ChatGPT with browser automation
   */
  async generateImage(
    prompt: string,
    referenceImages?: string[]
  ): Promise<ChatGptImageResult> {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Starting ChatGPT image generation with prompt: "${prompt}"`);
      
      // Initialize browser and navigate to ChatGPT
      await this.initializeBrowser();
      await this.page?.waitForTimeout(5000); // 5 second delay
      
      // Ensure user is logged in
      await this.ensureLoggedIn();
      await this.page?.waitForTimeout(5000); // 5 second delay
      
      // Navigate to Images tab
      await this.navigateToImagesTab();
      await this.page?.waitForTimeout(5000); // 5 second delay
      
      // Upload reference images if provided
      await this.uploadReferenceImages(referenceImages || []);
      await this.page?.waitForTimeout(5000); // 5 second delay
      
      // Submit prompt and generate image
      await this.submitPromptAndGenerate(prompt);
      await this.page?.waitForTimeout(5000); // 5 second delay
      
      // Download the generated image
      const imagePath = await this.downloadGeneratedImage();
      
      const result: ChatGptImageResult = {
        imagePath,
        prompt,
        timestamp: new Date()
      };

      const duration = Date.now() - startTime;
      this.logger.log(`ChatGPT image generation completed in ${duration}ms: ${imagePath}`);
      
      return result;

    } catch (error) {
      this.logger.error(`ChatGPT image generation failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.logger.log('Browser resources cleaned up');
    } catch (error) {
      this.logger.error(`Failed to cleanup browser resources: ${error.message}`);
    }
  }

  /**
   * Get the relative path for frontend access
   */
  getRelativeImagePath(imagePath: string): string {
    const relativePath = path.relative(process.cwd(), imagePath);
    return relativePath.replace(/\\/g, '/'); // Normalize path separators
  }
}