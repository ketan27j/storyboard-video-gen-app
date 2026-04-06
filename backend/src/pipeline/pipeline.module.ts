import { Module } from '@nestjs/common';
import { PipelineController } from './pipeline.controller';
import { PipelineService } from './pipeline.service';
import { PipelineGateway } from './pipeline.gateway';
import { GenerationModule } from '../generation/generation.module';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [GenerationModule, DatabaseModule],
  controllers: [PipelineController],
  providers: [PipelineService, PipelineGateway],
  exports: [PipelineService, PipelineGateway],
})
export class PipelineModule {}
