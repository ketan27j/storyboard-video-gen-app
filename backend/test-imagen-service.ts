import { ImagenService, ImageGenerationConfig } from './src/generation/imagen.service';

async function testImagenService() {
  console.log('Testing ImagenService with Google Gen AI SDK...');
  
  const service = new ImagenService();
  
  // Test basic text-to-image generation
  const config: ImageGenerationConfig = {
    aspectRatio: '1:1',
    candidateCount: 1,
    includeText: true
  };

  try {
    console.log('Testing basic image generation...');
    const result = await service.generateImage(
      'A futuristic city skyline at sunset',
      undefined,
      config
    );
    
    console.log('✅ Basic image generation successful!');
    console.log('Image buffer size:', result.imageBuffer.length);
    console.log('MIME type:', result.mimeType);
    console.log('Text response:', result.textResponse);
    console.log('Finish reason:', result.finishReason);
    
  } catch (error) {
    console.log('❌ Basic image generation failed:', error instanceof Error ? error.message : String(error));
  }

  // Test with reference images (if available)
  try {
    console.log('\nTesting image generation with reference images...');
    const result = await service.generateImage(
      'Create a pencil sketch of this dog wearing a cowboy hat',
      [
        {
          uri: 'gs://cloud-samples-data/generative-ai/image/dog-1.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      config
    );
    
    console.log('✅ Image generation with reference successful!');
    console.log('Image buffer size:', result.imageBuffer.length);
    console.log('MIME type:', result.mimeType);
    
  } catch (error) {
    console.log('❌ Image generation with reference failed:', error instanceof Error ? error.message : String(error));
  }

  console.log('\n✅ Chat session functionality temporarily removed - Google Gen AI SDK chat API not yet fully implemented');

  console.log('\n🎉 All tests completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testImagenService().catch(console.error);
}

export { testImagenService };