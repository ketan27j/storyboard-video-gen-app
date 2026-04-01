import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleAuth } from 'google-auth-library';
import { GoogleGenAI, GenerateContentConfig } from '@google/genai';
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';

export interface ReferenceImageInput {
  /** Base64-encoded image bytes (no data-URI prefix). */
  base64: string;
  /** MIME type of the image. Defaults to 'image/jpeg'. */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Subject type for subject image reference */
  subjectType?: 'SUBJECT_TYPE_OBJECT' | 'SUBJECT_TYPE_PERSON' | 'SUBJECT_TYPE_ANIMAL' | 'SUBJECT_TYPE_OTHER';
  /** Image description of the reference image */
  imageDescription?: string;
}

export interface CloudStorageImageInput {
  /** Google Cloud Storage URI (e.g., gs://bucket/file.jpg) */
  uri: string;
  /** MIME type of the image. Defaults to 'image/jpeg'. */
  mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface ImageGenerationConfig {
  /** Aspect ratio for generated images. Valid ratios: "1:1", "3:2", "2:3", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9" */
  aspectRatio?: '1:1' | '3:2' | '2:3' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  /** Number of image candidates to generate */
  candidateCount?: number;
  /** Whether to include text in the response alongside images */
  includeText?: boolean;
}

export interface GenerateImageResult {
  /** Raw image bytes of the generated image. */
  imageBuffer: Buffer;
  /** MIME type returned by the model (e.g. 'image/jpeg'). */
  mimeType: string;
  /** Optional text response from the model */
  textResponse?: string;
  /** Finish reason for the generation */
  finishReason?: string;
}

export interface ImageEditSession {
  sessionId: string;
  chatId: string;
  lastImageBuffer?: Buffer;
  lastMimeType?: string;
}

@Injectable()
export class ImagenService implements OnModuleInit {
  private readonly logger = new Logger(ImagenService.name);

  /**
   * Gemini 2.5 Flash Image supports up to 3 input reference images
   * (per the model's input image context window).
   */
  private static readonly MAX_REFERENCE_IMAGES = 3;

  /** Supported aspect ratios for image generation */
  private static readonly SUPPORTED_ASPECT_RATIOS = [
    '1:1', '3:2', '2:3', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'
  ];

  /** Re-use a single GoogleAuth instance across all requests. */
  private auth: GoogleAuth;

  /** Request timeout in milliseconds */
  private readonly requestTimeout = parseInt(process.env.IMAGE_GEN_TIMEOUT || '120000', 10);

  /** Retry configuration */
  private readonly maxRetries = 1;
  private readonly retryDelay = 1000;

  /** Google Gen AI client */
  private genaiClient: GoogleGenAI;

  /** Prediction Service Client for Imagen 3.0 */
  private predictionServiceClient: PredictionServiceClient;

  onModuleInit() {
    this.auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    console.log(this.auth)
    // Initialize Google Gen AI client
    this.genaiClient = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_PROJECT_ID,
      location: process.env.GOOGLE_LOCATION || 'us-central1',
    });

    // Initialize Prediction Service Client for Imagen 3.0
    const clientOptions = {
      apiEndpoint: `${process.env.GOOGLE_LOCATION || 'us-central1'}-aiplatform.googleapis.com`,
    };
    this.predictionServiceClient = new PredictionServiceClient(clientOptions);
  }

  /**
   * Generate an image using Gemini 2.5 Flash Image on Vertex AI.
   *
   * The model accepts up to 3 reference images alongside a text prompt
   * and produces a new image maintaining subject consistency.
   *
   * @param prompt          Text prompt describing the desired output image.
   * @param referenceImages Up to 3 reference images as base64 strings or cloud storage URIs.
   * @param config          Generation configuration including aspect ratio, candidate count, and text inclusion.
   * @returns               Generated image buffer, MIME type, optional text response, and finish reason.
   *
   * @example
   * const result = await imagenService.generateImage(
   *   'Generate a photorealistic portrait of this person wearing a red jacket',
   *   [
   *     { base64: '<base64>', mimeType: 'image/jpeg' },
   *     { base64: '<base64>', mimeType: 'image/png'  },
   *   ],
   *   { aspectRatio: '1:1', candidateCount: 1, includeText: true }
   * );
   */
  async generateImage(
    prompt: string,
    referenceImages?: (ReferenceImageInput | CloudStorageImageInput)[],
    config?: ImageGenerationConfig,
  ): Promise<GenerateImageResult> {
    // Add retry logic with exponential backoff
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.generateImageRequest(prompt, referenceImages, config);
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          this.logger.error(`Image generation failed after ${this.maxRetries} attempts: ${error.message}`);
          throw error;
        }

        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        this.logger.warn(`Image generation attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Core image generation request logic using Google Gen AI SDK
   */
  private async generateImageRequest(
    prompt: string,
    referenceImages?: (ReferenceImageInput | CloudStorageImageInput)[],
    config?: ImageGenerationConfig,
  ): Promise<GenerateImageResult> {
    const projectId = process.env.GOOGLE_PROJECT_ID;

    if (!projectId) {
      throw new Error(
        'GOOGLE_PROJECT_ID is not configured. ' +
        'Set IMAGE_GEN_PROVIDER=manual to skip real generation.',
      );
    }
    const baseSystemPrompt =
      'You are an expert AI animation and illustration assistant. ' +
      'Your primary job is to generate images that EXACTLY match the visual and animation style shown in the reference images provided. ' +
      'You must replicate the art style, color palette, line weight, shading technique, and overall aesthetic of the reference images precisely. ' +
      'Do NOT generate photorealistic or real-world images unless the reference images are photorealistic. ' +
      'Always follow every instruction in the user prompt while preserving the reference style faithfully.';
    
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
    // Validate aspect ratio
    // ------------------------------------------------------------------
    if (config?.aspectRatio && !ImagenService.SUPPORTED_ASPECT_RATIOS.includes(config.aspectRatio)) {
      throw new Error(
        `Unsupported aspect ratio: ${config.aspectRatio}. ` +
        `Supported ratios: ${ImagenService.SUPPORTED_ASPECT_RATIOS.join(', ')}`
      );
    }

    // Default to 9:16 aspect ratio if none is provided (vertical image generation).
    if (config && !config.aspectRatio) {
      config.aspectRatio = '9:16';
    } else if (!config) {
      config = { aspectRatio: '9:16' };
    }

    // ------------------------------------------------------------------
    // Build the `contents` array (Gemini multimodal message format).
    // Support both local base64 images and cloud storage URIs.
    // When reference images are provided we insert an explicit preamble
    // text BEFORE them so the model knows their role (style reference),
    // then add the actual generation instruction after.
    // ------------------------------------------------------------------
    const hasReferenceImages = referenceImages && referenceImages.length > 0;

    const imageParts = referenceImages?.map((img) => {
      if ('uri' in img) {
        return {
          fileData: {
            mimeType: img.mimeType ?? 'image/jpeg',
            fileUri: img.uri,
          },
        };
      } else {
        return {
          inlineData: {
            mimeType: img.mimeType ?? 'image/jpeg',
            data: img.base64,
          },
        };
      }
    }) ?? [];

    // Build the user message parts.
    // Structure: [style preamble text] → [reference images] → [generation instruction]
    // This ordering ensures the model reads what the images *are* before seeing them,
    // then receives the specific scene instruction.
    const userParts: any[] = [];

    if (hasReferenceImages) {
      userParts.push({
        text:
          `The following ${referenceImages!.length} image(s) define the REQUIRED animation/illustration style. ` +
          'You MUST replicate this exact visual style, color palette, line art, shading, and overall aesthetic in your generated image. ' +
          'Do not deviate from this style under any circumstances.',
      });
      userParts.push(...imageParts);
      userParts.push({
        text:
          `Now generate a new image IN EXACTLY THE SAME ANIMATION STYLE as the reference image(s) above.\n\n` +
          `Scene instruction: ${prompt}`,
      });
    } else {
      userParts.push({ text: prompt });
    }

    const contents = [
      {
        role: 'user',
        parts: userParts,
      },
    ];

    // ------------------------------------------------------------------
    // Generation config using Google Gen AI SDK types
    // ------------------------------------------------------------------
    // Always include TEXT when reference images are provided so the model can
    // reason about them before generating. Without TEXT modality the model
    // tends to ignore the reference images and generate something unrelated.
    // The systemInstruction is set here (not in the user message) so the
    // model treats it as a persistent system-level directive.
    const generationConfig: GenerateContentConfig = {
      responseModalities: hasReferenceImages || config?.includeText ? ['TEXT', 'IMAGE'] : ['IMAGE'],
      systemInstruction: baseSystemPrompt,
    };

    if (config?.aspectRatio) {
      generationConfig.imageConfig = {
        aspectRatio: config.aspectRatio,
      };
    }

    if (config?.candidateCount) {
      generationConfig.candidateCount = config.candidateCount;
    }

    // ------------------------------------------------------------------
    // Request using Google Gen AI SDK
    // ------------------------------------------------------------------
    this.logger.debug(
      `Calling Gemini 2.5 Flash Image with prompt="${prompt}" ` +
      `and ${referenceImages?.length ?? 0} reference image(s). ` +
      `Style enforcement: ${hasReferenceImages ? 'ON' : 'OFF'}.`,
    );

    const response = await this.genaiClient.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents,
      config: generationConfig,
    });

    // ------------------------------------------------------------------
    // Parse response
    // The response is a standard Gemini generateContent response.
    // candidates[0].content.parts is an array of mixed text/image parts.
    // We pick the first image part returned.
    // ------------------------------------------------------------------
    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new Error('No candidates returned from Gemini 2.5 Flash Image.');
    }

    // Check finish reason
    const finishReason = candidate.finishReason;
    if (finishReason !== 'STOP') {
      this.logger.warn(`Gemini 2.5 Flash Image generation finished with reason: ${finishReason}`);
    }

    const parts = candidate.content?.parts ?? [];

    const imagePart = parts.find((p) => p.inlineData?.data);
    const textPart = parts.find((p) => p.text);

    if (!imagePart?.inlineData) {
      this.logger.error(
        'Unexpected Gemini 2.5 Flash Image response shape:',
        JSON.stringify(response),
      );
      throw new Error('No image data returned from Gemini 2.5 Flash Image.');
    }

    return {
      imageBuffer: Buffer.from(imagePart.inlineData.data, 'base64'),
      mimeType: imagePart.inlineData.mimeType,
      textResponse: textPart?.text,
      finishReason,
    };
  }

}