import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';

/**
 * GET /health answers 200 as soon as the application runs: compose uses it
 * to know when the API is up.
 */
@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
