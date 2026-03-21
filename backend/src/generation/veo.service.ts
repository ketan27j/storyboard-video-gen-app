import { Injectable, Logger } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';

@Injectable()
export class VeoService {
  private readonly logger = new Logger(VeoService.name);

  async generateVideo(prompt: string, imagePath?: string): Promise<Buffer> {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    this.logger.log(`Starting Veo 3 Fast video generation with prompt: ${prompt.substring(0, 100)}...`);
    this.logger.log(`Project ID: ${projectId}, Location: ${location}`);
    this.logger.log(`Image path: ${imagePath || 'none'}`);

    if (!projectId) {
      throw new Error('GOOGLE_PROJECT_ID not configured for Veo 3 Fast.');
    }

    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    this.logger.log(`Auth token obtained: ${token ? 'yes' : 'no'}`);
    if (token) {
      this.logger.log(`Token preview: ${token.substring(0, 20)}...`);
    }

    const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.1-fast-generate-preview:predictLongRunning`;
    this.logger.log(`API endpoint: ${endpoint}`);

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

    // this.logger.log(`Making API request with instance: ${JSON.stringify(instance)}`);
    
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
          aspectRatio: '9:16',
          sampleCount: 1,
          resolution:'720p',
          generateAudio:false,
          personGeneration:'allow_all'
        },
      }),
    });

    this.logger.log(`Response status: ${response.status} ${response.statusText}`);
    this.logger.log(`Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

    if (!response.ok) {
      const err = await response.text();
      this.logger.error(`API request failed with status ${response.status}: ${err}`);
      throw new Error(`Veo 3 Fast API error: ${err}`);
    }

    let operation;
    try {
      operation = await response.json();
      this.logger.log(`Successfully parsed operation response: ${JSON.stringify(operation)}`);
    } catch (jsonError) {
      const text = await response.text();
      this.logger.error(`Failed to parse JSON response: ${text.substring(0, 500)}...`);
      this.logger.error(`Response text length: ${text.length} characters`);
      this.logger.error(`Response text starts with: ${text.substring(0, 100)}`);
      throw new Error(`Veo 3 Fast API error: Invalid JSON response - ${text.substring(0, 500)}...`);
    }
    
    // Extract operation name from the response
    const operationName = operation.name;
    this.logger.log(`Operation name received: ${operationName}`);
    
    // Validate that operation name is properly formatted
    if (!operationName || !operationName.includes('/operations/')) {
      throw new Error(`Invalid operation name format: ${operationName}`);
    }

    // Poll for completion
    const timeout = parseInt(process.env.VIDEO_GEN_TIMEOUT || '300000', 10);
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 10_000));

      // Veo requires fetchPredictOperation (POST) — the generic GET /v1/{operationName}
      // returns 404 because Veo operation IDs are UUIDs, not numeric Longs.
      const pollRes = await fetch(
        `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/veo-3.1-fast-generate-preview:fetchPredictOperation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ operationName }),
        },
      );
      
      if (!pollRes.ok) {
        const pollErr = await pollRes.text();
        this.logger.error(`Polling failed: ${pollErr}`);
        throw new Error(`Veo 3 Fast polling error: ${pollErr}`);
      }

      let pollData;
      try {
        pollData = await pollRes.json();
        // this.logger.log(`Polling response: ${JSON.stringify(pollData)}`);
      } catch (pollJsonError) {
        const pollText = await pollRes.text();
        this.logger.error(`Failed to parse polling JSON response: ${pollText.substring(0, 500)}...`);
        this.logger.error(`Polling response text length: ${pollText.length} characters`);
        this.logger.error(`Polling response text starts with: ${pollText.substring(0, 100)}`);
        throw new Error(`Veo 3 Fast polling error: Invalid JSON response - ${pollText.substring(0, 500)}...`);
      }

      if (pollData.done) {
        // Log the full top-level keys so we can see the real response shape
        this.logger.log(`pollData top-level keys: ${Object.keys(pollData).join(', ')}`);
        if (pollData.response) {
          this.logger.log(`pollData.response keys: ${Object.keys(pollData.response).join(', ')}`);
        }

        // fetchPredictOperation wraps the result differently than predictLongRunning.
        // Try all known locations for the predictions array:
        //   1. pollData.response.predictions  (standard LRO shape)
        //   2. pollData.predictions            (flat shape)
        //   3. pollData.response.videos        (some Veo preview variants)
        const predictions =
          pollData.response?.predictions ??
          pollData.predictions ??
          pollData.response?.videos ??
          null;

        this.logger.log(`Predictions found at: ${
          pollData.response?.predictions ? 'response.predictions' :
          pollData.predictions ? 'predictions' :
          pollData.response?.videos ? 'response.videos' : 'NONE'
        }`);

        if (!predictions || predictions.length === 0) {
          throw new Error(`No predictions in Veo 3 Fast response. Full response: ${JSON.stringify(pollData).substring(0, 500)}`);
        }

        const rawPrediction = predictions[0];
        this.logger.log(`Raw prediction keys: ${Object.keys(rawPrediction).join(', ')}`);

        // Unwrap nested .video if present, otherwise the prediction itself is the video object
        const prediction = rawPrediction.video ?? rawPrediction;

        if (prediction.uri) {
          this.logger.log(`Fetching video from URI: ${prediction.uri}`);

          const videoRes = await fetch(prediction.uri, {
            headers: { Authorization: `Bearer ${token}` },
          });

          this.logger.log(`Video fetch response status: ${videoRes.status} ${videoRes.statusText}`);

          if (!videoRes.ok) {
            const videoErr = await videoRes.text();
            this.logger.error(`Video fetch failed with status ${videoRes.status}: ${videoErr}`);
            throw new Error(`Veo 3 Fast video fetch error: ${videoErr}`);
          }

          this.logger.log(`Video fetch successful, content-length: ${videoRes.headers.get('content-length')} bytes`);
          return Buffer.from(await videoRes.arrayBuffer());

        } else if (prediction.bytesBase64Encoded) {
          this.logger.log(`Video returned inline as base64 (length: ${prediction.bytesBase64Encoded.length})`);
          return Buffer.from(prediction.bytesBase64Encoded, 'base64');

        } else {
          throw new Error(`Unexpected video payload shape: ${JSON.stringify(rawPrediction).substring(0, 300)}`);
        }
      }
    }

    throw new Error('Veo 3 Fast video generation timed out');
  }
}