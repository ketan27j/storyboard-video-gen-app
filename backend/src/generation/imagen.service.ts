import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ImagenService {
  private readonly logger = new Logger(ImagenService.name);

  async generateImage(prompt: string): Promise<Buffer> {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID not configured. Set IMAGE_GEN_PROVIDER=manual to skip real generation.');
    }

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

    // Get Google auth token via ADC
    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '16:9',
          safetyFilterLevel: 'block_some',
          personGeneration: 'allow_adult',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Imagen 3 API error: ${err}`);
    }

    const data = await response.json();
    const b64 = data.predictions?.[0]?.bytesBase64Encoded;
    if (!b64) throw new Error('No image data returned from Imagen 3');

    return Buffer.from(b64, 'base64');
  }
}
