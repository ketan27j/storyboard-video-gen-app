import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VeoService {
  private readonly logger = new Logger(VeoService.name);

  async generateVideo(prompt: string, imagePath?: string): Promise<Buffer> {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID not configured for Veo 2.');
    }

    const { GoogleAuth } = await import('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-2.0-generate-001:predictLongRunning`;

    const instance: any = { prompt };
    if (imagePath) {
      // Read image and encode as base64
      const fs = await import('fs');
      const path = await import('path');
      const outputDir = process.env.OUTPUT_DIR || './output';
      const fullPath = path.join(outputDir, '..', imagePath);
      if (fs.existsSync(fullPath)) {
        const imgBuffer = fs.readFileSync(fullPath);
        instance.image = {
          bytesBase64Encoded: imgBuffer.toString('base64'),
          mimeType: 'image/png',
        };
      }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [instance],
        parameters: {
          durationSeconds: 8,
          aspectRatio: '16:9',
          sampleCount: 1,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Veo 2 API error: ${err}`);
    }

    const operation = await response.json();
    const operationName = operation.name;

    // Poll for completion
    const timeout = parseInt(process.env.VIDEO_GEN_TIMEOUT || '300000', 10);
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10_000));

      const pollRes = await fetch(
        `https://${location}-aiplatform.googleapis.com/v1/${operationName}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const pollData = await pollRes.json();

      if (pollData.done) {
        const videoUri = pollData.response?.predictions?.[0]?.video?.uri;
        if (!videoUri) throw new Error('No video URI in Veo 2 response');

        const videoRes = await fetch(videoUri, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return Buffer.from(await videoRes.arrayBuffer());
      }
    }

    throw new Error('Veo 2 video generation timed out');
  }
}
