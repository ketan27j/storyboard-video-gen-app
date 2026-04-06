import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PipelineSession } from './entities/pipeline-session.entity';
import { DatabaseService } from './database.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DATABASE_PATH || './storyboard.db',
      entities: [PipelineSession],
      synchronize: true,
      logging: false,
    }),
    TypeOrmModule.forFeature([PipelineSession]),
  ],
  providers: [DatabaseService],
  exports: [TypeOrmModule, DatabaseService],
})
export class DatabaseModule {}