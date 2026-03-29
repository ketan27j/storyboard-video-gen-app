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
   * Generate an image using Imagen 3.0 on Vertex AI.
   *
   * @param prompt          Text prompt describing the desired output image.
   * @param referenceImages Up to 3 reference images as base64 strings for consistent generation.
   * @param config          Generation configuration including aspect ratio, candidate count, and safety settings.
   * @returns               Generated image buffer, MIME type, optional text response, and finish reason.
   */
  async generateImageImagen3(
    prompt: string,
    referenceImages?: ReferenceImageInput[],
    config?: ImageGenerationConfig,
  ): Promise<GenerateImageResult> {
    const projectId = process.env.GOOGLE_PROJECT_ID;
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    if (!projectId) {
      throw new Error(
        'GOOGLE_PROJECT_ID is not configured. ' +
        'Set IMAGE_GEN_PROVIDER=manual to skip real generation.',
      );
    }

    // Configure the parent resource
    const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001`;

    // Base system prompt for consistent animation style
    const baseSystemPrompt = ''
    // 'You are a expert AI animation assistant. ' +
    // 'Your job is to turn a given prompt to beautiful image keeping every single instruction in image ' +
    // 'Generate the images keeping character consitency using image name and name in prompt ' +
    // '';
    const finalPrompt = `${baseSystemPrompt}\n\n${prompt}`;

    // Build instance with prompt — must be a protobuf Value object
    const instanceObj: Record<string, unknown> = {
      prompt: finalPrompt,
    };

    // if (referenceImages && referenceImages.length > 0) {
    //   let REFERENCE_ID = 0;
    //   instanceObj.referenceImages = referenceImages.map((img) => ({
    //     referenceType: 'REFERENCE_TYPE_SUBJECT',
    //     referenceId: REFERENCE_ID++,
    //     referenceImage: {
    //       bytesBase64Encoded: img.base64,
    //     },
    //     subjectImageConfig: {
    //       subjectType: img.subjectType || 'SUBJECT_TYPE_PERSON',
    //       imageDescription: img.imageDescription || '',
    //     },
    //   }));
    // }

    // Parameters must also be a protobuf Value object
    const parameterObj: Record<string, unknown> = {
      sampleCount: config?.candidateCount || 1,
    };
    if (config?.aspectRatio) {
      parameterObj.aspectRatio = config.aspectRatio;
    }

    const request = {
      endpoint,
      instances: [helpers.toValue(instanceObj)],
      parameters: helpers.toValue(parameterObj),
    };

    this.logger.log(`Calling Imagen 3.0 API with endpoint: ${endpoint}, params: ${JSON.stringify(parameterObj)}`);

    // Predict request
    let response;
    try {
      const predictResponse = await this.predictionServiceClient.predict(request);
      response = Array.isArray(predictResponse) ? predictResponse[0] : predictResponse;
    } catch (error) {
      this.logger.error(`Imagen 3.0 API call failed: ${error.message}`);
      throw new Error(`Imagen 3.0 generation failed: ${error.message}`);
    }

    const predictions = response.predictions;

    if (predictions.length === 0) {
      throw new Error(
        'No image was generated. Check the request parameters and prompt.'
      );
    }

    // Return the first prediction
    const prediction = predictions[0];
    const imageBuffer = Buffer.from(
      prediction.structValue.fields.bytesBase64Encoded.stringValue,
      'base64'
    );

    return {
      imageBuffer: imageBuffer,
      mimeType: 'image/png', // Imagen 3.0 returns PNG format
      textResponse: undefined, // Imagen 3.0 doesn't return text response
      finishReason: 'STOP',
    };
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

    // ------------------------------------------------------------------
    // Build the `contents` array (Gemini multimodal message format).
    // Support both local base64 images and cloud storage URIs.
    // ------------------------------------------------------------------
    const imageParts = referenceImages?.map((img) => {
      if ('uri' in img) {
        // Cloud storage URI
        return {
          fileData: {
            mimeType: img.mimeType ?? 'image/jpeg',
            fileUri: img.uri,
          },
        };
      } else {
        // Local base64 image
        return {
          inlineData: {
            mimeType: img.mimeType ?? 'image/jpeg',
            data: img.base64,
          },
        };
      }
    }) ?? [];

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
    // Generation config using Google Gen AI SDK types
    // ------------------------------------------------------------------
    const generationConfig: GenerateContentConfig = {
      responseModalities: ['IMAGE'],
    };

    if (config?.includeText) {
      generationConfig.responseModalities.push('TEXT');
    }

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
      `and ${referenceImages?.length ?? 0} reference image(s).`,
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