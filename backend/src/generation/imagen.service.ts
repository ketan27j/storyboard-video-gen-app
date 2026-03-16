import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';

export interface ReferenceImageInput {
  /** Base64-encoded image bytes (no data-URI prefix). */
  base64: string;
  /** MIME type of the image. Defaults to 'image/jpeg'. */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface GenerateImageResult {
  /** Raw image bytes of the generated image. */
  imageBuffer: Buffer;
  /** MIME type returned by the model (e.g. 'image/jpeg'). */
  mimeType: string;
}

@Injectable()
export class ImagenService implements OnModuleInit {
  private readonly logger = new Logger(ImagenService.name);

  /**
   * Gemini 2.5 Flash Image supports up to 3 input reference images
   * (per the model's input image context window).
   */
  private static readonly MAX_REFERENCE_IMAGES = 3;

  /** Re-use a single GoogleAuth instance across all requests. */
  private auth: GoogleAuth;

  onModuleInit() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }

  /**
   * Generate an image using Gemini 2.5 Flash Image on Vertex AI.
   *
   * The model accepts up to 3 reference images alongside a text prompt
   * and produces a new image maintaining subject consistency.
   *
   * @param prompt          Text prompt describing the desired output image.
   * @param referenceImages Up to 3 reference images as base64 strings.
   * @returns               Generated image buffer and its MIME type.
   *
   * @example
   * const result = await imagenService.generateImage(
   *   'Generate a photorealistic portrait of this person wearing a red jacket',
   *   [
   *     { base64: '<base64>', mimeType: 'image/jpeg' },
   *     { base64: '<base64>', mimeType: 'image/png'  },
   *   ],
   * );
   */
  async generateImage(
    prompt: string,
    referenceImages?: ReferenceImageInput[],
  ): Promise<GenerateImageResult> {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    if (!projectId) {
      throw new Error(
        'GOOGLE_PROJECT_ID is not configured. ' +
          'Set IMAGE_GEN_PROVIDER=manual to skip real generation.',
      );
    }

    // ------------------------------------------------------------------
    // Validate reference images
    // ------------------------------------------------------------------
    if (referenceImages && referenceImages.length > ImagenService.MAX_REFERENCE_IMAGES) {
      throw new Error(
        `Gemini 2.5 Flash Image supports at most ` +
          `${ImagenService.MAX_REFERENCE_IMAGES} reference images, ` +
          `but ${referenceImages.length} were provided.`,
      );
    }

    // ------------------------------------------------------------------
    // Auth — obtain a short-lived ADC token
    // ------------------------------------------------------------------
    const client = await this.auth.getClient();
    const tokenResponse = await client.getAccessToken();
    const token = tokenResponse.token;

    if (!token) {
      throw new Error('Failed to obtain Google Cloud access token via ADC.');
    }

    // ------------------------------------------------------------------
    // Endpoint
    // Gemini 2.5 Flash Image uses the generateContent endpoint, NOT
    // the :predict endpoint used by Imagen models.
    // ------------------------------------------------------------------
    const endpoint =
      `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}` +
      `/locations/${location}/publishers/google/models/gemini-2.5-flash-image:generateContent`;

    // ------------------------------------------------------------------
    // Build the `contents` array (Gemini multimodal message format).
    //
    // Layout of a single user turn:
    //   parts: [
    //     { inlineData: { mimeType, data } },  <- reference image 1
    //     { inlineData: { mimeType, data } },  <- reference image 2 (optional)
    //     { inlineData: { mimeType, data } },  <- reference image 3 (optional)
    //     { text: "<prompt>" },                <- text instruction
    //   ]
    // ------------------------------------------------------------------
    const imageParts =
      referenceImages?.map((img) => ({
        inlineData: {
          mimeType: img.mimeType ?? 'image/jpeg',
          data: img.base64,
        },
      })) ?? [];

    const contents = [
      {
        role: 'user',
        parts: [
          ...imageParts,
          { text: prompt },
        ],
      },
    ];

    // ------------------------------------------------------------------
    // Generation config
    // responseModalities MUST include "IMAGE" to get image output back.
    // Including "TEXT" as well lets the model also return a caption or
    // description alongside the image (drop it if you only want the image).
    // ------------------------------------------------------------------
    const generationConfig = {
      responseModalities: ['IMAGE', 'TEXT'],
    };

    // ------------------------------------------------------------------
    // Request
    // ------------------------------------------------------------------
    this.logger.debug(
      `Calling Gemini 2.5 Flash Image with prompt="${prompt}" ` +
        `and ${referenceImages?.length ?? 0} reference image(s).`,
    );

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents, generationConfig }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      this.logger.error(
        `Gemini 2.5 Flash Image API error (${response.status}): ${errorBody}`,
      );
      throw new Error(
        `Gemini 2.5 Flash Image API responded with ${response.status}: ${errorBody}`,
      );
    }

    const data = await response.json();

    // ------------------------------------------------------------------
    // Parse response
    // The response is a standard Gemini generateContent response.
    // candidates[0].content.parts is an array of mixed text/image parts.
    // We pick the first image part returned.
    // ------------------------------------------------------------------
    const parts: Array<{
      text?: string;
      inlineData?: { mimeType: string; data: string };
    }> = data.candidates?.[0]?.content?.parts ?? [];

    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData) {
      this.logger.error(
        'Unexpected Gemini 2.5 Flash Image response shape:',
        JSON.stringify(data),
      );
      throw new Error('No image data returned from Gemini 2.5 Flash Image.');
    }

    return {
      imageBuffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      mimeType: imagePart.inlineData.mimeType,
    };
  }
}