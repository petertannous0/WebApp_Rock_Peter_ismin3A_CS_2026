import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOkResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import type { TeacherView } from './teacher.js';
import { TeachersService } from './teachers.service.js';

@Controller('teachers')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
@ApiForbiddenResponse({ description: 'Requires the ADMIN role' })
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOkResponse({ description: 'Every teacher, by last name' })
  findAll(): Promise<TeacherView[]> {
    return this.teachers.findAll();
  }
}
