import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { CompaniesModule } from './companies/companies.module.js';
import { HealthController } from './health/health.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SessionModule } from './session/session.module.js';
import { StudentsModule } from './students/students.module.js';
import { TeachersModule } from './teachers/teachers.module.js';
import { UsersModule } from './users/users.module.js';

/**
 * GET /health answers 200 as soon as the application runs: compose uses it
 * to know when the API is up.
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SessionModule,
    CompaniesModule,
    TeachersModule,
    StudentsModule,
    AvailabilityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
