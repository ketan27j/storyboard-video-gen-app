#!/usr/bin/env ts-node

/**
 * Test script for ChatGPT image generation automation
 * 
 * Usage: npm run test:chatgpt
 * 
 * This script tests the ChatGPT automation service independently
 * to ensure it works before integrating with the main application.
 */

import { ChatGptService } from './src/generation/chatgpt.service';
import { Logger } from '@nestjs/common';

async function testChatGptAutomation() {
  const logger = new Logger('TestChatGpt');
  const chatGptService = new ChatGptService();
  
  logger.log('Starting ChatGPT automation test...');
  
  try {
    // Test prompt
    const testPrompt = 'A futuristic city skyline at sunset with flying cars and neon lights';
    
    logger.log(`Testing image generation with prompt: "${testPrompt}"`);
    
    // Generate image
    const result = await chatGptService.generateImage(testPrompt);
    
    logger.log(`✅ Image generation successful!`);
    logger.log(`📁 Image saved to: ${result.imagePath}`);
    logger.log(`📝 Prompt: ${result.prompt}`);
    logger.log(`⏰ Generated at: ${result.timestamp}`);
    
    // Get relative path for frontend access
    const relativePath = chatGptService.getRelativeImagePath(result.imagePath);
    logger.log(`🌐 Frontend URL: /${relativePath}`);
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`❌ Image generation failed: ${errorMessage}`);
    if (errorStack) {
      logger.error(errorStack);
    }
  } finally {
    // Cleanup browser resources
    await chatGptService.cleanup();
    logger.log('Browser resources cleaned up');
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testChatGptAutomation().catch(console.error);
}

export { testChatGptAutomation };