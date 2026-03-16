import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { GenerationService } from './generation.service';
import { ImagenService } from './imagen.service';
import { VeoService } from './veo.service';
import { GrokService } from './grok.service';
import { ChatGptService } from './chatgpt.service';
import { StorageModule } from '../storage/storage.module';
import { ImageProcessor } from '../jobs/image.processor';
import { VideoProcessor } from '../jobs/video.processor';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'image-generation' },
      { name: 'video-generation' },
    ),
    StorageModule,
    forwardRef(() => PipelineModule),
  ],
  providers: [
    GenerationService,
    ImagenService,
    VeoService,
    GrokService,
    ChatGptService,
    ImageProcessor,
    VideoProcessor,
  ],
  exports: [GenerationService],
})
export class GenerationModule {}
