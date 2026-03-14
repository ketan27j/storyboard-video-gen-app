import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Serve generated output files statically
  const outputDir = path.resolve(process.env.OUTPUT_DIR || './output');
  app.use('/output', express.static(outputDir));

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port);
  Logger.log(`🚀 Backend running at http://localhost:${port}`, 'Bootstrap');
  Logger.log(`📁 Serving output from ${outputDir}`, 'Bootstrap');
}

bootstrap();
