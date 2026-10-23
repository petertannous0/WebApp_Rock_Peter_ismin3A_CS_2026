import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard, type JwtPayload } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { NoProfile, type CompanyTutorSchedule, type StudentSchedule, type TeacherDefense } from './schedule.js';
import { ScheduleService } from './schedule.service.js';

function mapErrors(error: unknown): never {
  if (error instanceof NoProfile) throw new NotFoundException(error.message);
  throw error;
}

/**
 *   GET /me/defenses               the teacher's defenses, day by day
 *   GET /me/defense                the student's defense, or null
 *   GET /company-tutors/schedule   each company tutor's defenses, for the admin's emails
 */
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('me/defenses')
  @Roles('ENSEIGNANT')
  @ApiForbiddenResponse({ description: 'Requires the ENSEIGNANT role' })
  @ApiNotFoundResponse({ description: 'The account is not linked to a teacher' })
  forTeacher(@CurrentUser() user: JwtPayload): Promise<TeacherDefense[]> {
    return this.schedule.forTeacher(user.sub).catch(mapErrors);
  }

  @Get('me/defense')
  @Roles('ELEVE')
  @ApiForbiddenResponse({ description: 'Requires the ELEVE role' })
  @ApiNotFoundResponse({ description: 'The account is not linked to a student' })
  forStudent(@CurrentUser() user: JwtPayload): Promise<StudentSchedule> {
    return this.schedule.forStudent(user.sub).catch(mapErrors);
  }

  @Get('company-tutors/schedule')
  @Roles('ADMIN')
  @ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
  forCompanyTutors(): Promise<CompanyTutorSchedule[]> {
    return this.schedule.forCompanyTutors();
  }
}
